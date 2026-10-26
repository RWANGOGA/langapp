"""A tutor's earnings: every lesson they taught, priced by its own length.

The school pays a fixed rate per 60 minutes, so a 30-minute lesson is worth
half and a 90-minute lesson one and a half. Only lessons marked completed are
paid - a scheduled, cancelled or no-show class is not teaching.

Payouts themselves are made outside the app (bank transfer, mobile money), so
this endpoint reports what is owed rather than pretending to know what has
already been sent.
"""
from datetime import timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.time import utc_now
from app.db.session import get_db
from app.models.user import Class, ClassStatus, User, UserRole
from app.schemas.tutor_earnings import (
    EarningLesson,
    EarningMonth,
    EarningRate,
    EarningTotals,
    TutorEarnings,
)

router = APIRouter()

# Policy, not data: $10.00 per 60 minutes of teaching.
RATE_CENTS = 1000
RATE_MINUTES = 60
RATE_CURRENCY = "USD"

# The statement lists recent lessons; the totals still cover everything.
LESSON_LIMIT = 100


def price_lesson(duration_minutes: int) -> int:
    """Pro-rate the hourly rate to the lesson's length, rounded to the cent."""
    return (RATE_CENTS * max(0, duration_minutes) + RATE_MINUTES // 2) // RATE_MINUTES


@router.get("/tutor/earnings", response_model=TutorEarnings)
async def get_tutor_earnings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=403, detail="Only tutors have earnings")

    result = await db.execute(
        select(Class.id, Class.scheduled_at, Class.duration_minutes, Class.title, User.full_name)
        .join(User, User.id == Class.learner_id)
        .where(Class.tutor_id == current_user.id, Class.status == ClassStatus.COMPLETED)
        .order_by(Class.scheduled_at.desc())
    )
    rows = result.all()

    months: Dict[str, Dict[str, int]] = {}
    lessons: List[EarningLesson] = []
    total_cents = total_minutes = 0
    this_month_cents = last_month_cents = 0

    # One pass over the tutor's own history: the totals, the monthly statement
    # and the lesson list must agree, so they are summed from the same rows.
    newest = rows[0].scheduled_at if rows else None
    for row in rows:
        cents = price_lesson(row.duration_minutes)
        key = row.scheduled_at.strftime("%Y-%m")
        bucket = months.setdefault(key, {"lessons": 0, "minutes": 0, "cents": 0})
        bucket["lessons"] += 1
        bucket["minutes"] += row.duration_minutes
        bucket["cents"] += cents
        total_cents += cents
        total_minutes += row.duration_minutes
        if len(lessons) < LESSON_LIMIT:
            lessons.append(
                EarningLesson(
                    id=row.id,
                    held_at=row.scheduled_at,
                    learner=row.full_name,
                    topic=row.title,
                    minutes=row.duration_minutes,
                    amount_cents=cents,
                )
            )

    if newest is not None:
        # Calendar months, not rolling 30-day windows: "this month" on a
        # statement has to mean the same thing to the tutor and the accountant.
        now = utc_now()
        this_month = now.strftime("%Y-%m")
        previous = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        this_month_cents = months.get(this_month, {}).get("cents", 0)
        last_month_cents = months.get(previous, {}).get("cents", 0)

    return TutorEarnings(
        rate=EarningRate(amount_cents=RATE_CENTS, currency=RATE_CURRENCY, per_minutes=RATE_MINUTES),
        totals=EarningTotals(
            all_time_cents=total_cents,
            all_time_lessons=len(rows),
            all_time_minutes=total_minutes,
            this_month_cents=this_month_cents,
            last_month_cents=last_month_cents,
        ),
        months=[
            EarningMonth(month=key, lessons=v["lessons"], minutes=v["minutes"], amount_cents=v["cents"])
            for key, v in sorted(months.items(), reverse=True)
        ],
        lessons=lessons,
    )
