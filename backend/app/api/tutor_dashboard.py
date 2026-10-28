from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, time, timedelta

from app.core.time import utc_now, to_utc_iso
from app.db.session import get_db
from app.models.user import User, UserRole, TutorProfile, Class, ClassStatus
from app.models.notification import Notification
from app.schemas.tutor_dashboard import TutorDashboardResponse
from app.api.auth import get_current_user

router = APIRouter()

# How far ahead the tutor portal looks. One schedule window feeds the "today"
# list, the "upcoming" list and the month calendar - a today-only query leaves
# the last two empty, which reads as "you have nothing booked" while classes sit
# on the books.
SCHEDULE_WINDOW_DAYS = 30


@router.get("/tutor/dashboard", response_model=TutorDashboardResponse)
async def get_tutor_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")

    if not current_user.tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    profile = current_user.tutor_profile

    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    unread = unread_result.scalar() or 0

    # UTC day/now - never the server's local clock (global deployment).
    now = utc_now()
    today = now.date()

    # The schedule window: from the start of today (UTC) through the next
    # SCHEDULE_WINDOW_DAYS days. History stays out; same-day cancelled classes
    # stay in so the tutor sees "cancelled", not a gap.
    window_start = datetime.combine(today, time.min)
    window_end = window_start + timedelta(days=SCHEDULE_WINDOW_DAYS + 1)

    classes_result = await db.execute(
        select(Class)
        .options(selectinload(Class.learner))
        .where(
            and_(
                Class.tutor_id == current_user.id,
                Class.scheduled_at >= window_start,
                Class.scheduled_at < window_end,
            )
        )
        .order_by(Class.scheduled_at.asc())
    )
    window_classes = classes_result.scalars().all()

    # Get all learners assigned to this tutor
    learners_result = await db.execute(
        select(User)
        .where(User.tutor_id == current_user.id)
        .options(selectinload(User.classes))
    )
    learners = learners_result.scalars().all()

    # Build sessions list from the window
    sessions = []
    for cls in window_classes:
        sessions.append(
            {
                "id": f"s{cls.id}",
                "classId": cls.id,
                "date": cls.scheduled_at.date().isoformat(),
                "time": cls.scheduled_at.strftime("%H:%M"),
                "startsAt": to_utc_iso(cls.scheduled_at),
                "status": cls.status.value,
                "learner": cls.learner.full_name if cls.learner else "Unknown",
                "topic": cls.title,
                "provider": (
                    "In-app" if cls.room_name
                    else ("Zoom" if cls.zoom_url else ("Google Meet" if cls.meet_url else None))
                ),
                "meetingUrl": cls.zoom_url or cls.meet_url,
                "inAppCall": bool(cls.room_name),
            }
        )

    # The next session is the first scheduled class still ahead of us *inside
    # the window*, derived from the list above rather than a second query - so
    # "Next session" can never point at a class the portal does not list.
    next_class = next(
        (
            cls
            for cls in window_classes
            if cls.status == ClassStatus.SCHEDULED and cls.scheduled_at >= now
        ),
        None,
    )

    if next_class:
        seconds_left = int((next_class.scheduled_at - now).total_seconds())
        next_session = {
            "sessionId": f"s{next_class.id}",
            "classId": next_class.id,
            "learner": next_class.learner.full_name if next_class.learner else "Unknown",
            "topic": next_class.title,
            "secondsLeft": max(0, seconds_left),
            "startsAt": to_utc_iso(next_class.scheduled_at),
            "meetingUrl": next_class.zoom_url or next_class.meet_url,
            "inAppCall": bool(next_class.room_name),
        }
    else:
        next_session = {
            "sessionId": "none",
            "learner": "No upcoming sessions",
            "topic": "—",
            "secondsLeft": 0,
            "startsAt": None,
            "meetingUrl": None,
        }

    # Build learner summaries
    learner_summaries = []
    for learner in learners:
        # Get their proficiency level
        level = "A1"
        if learner.proficiency_level:
            level = learner.proficiency_level.value

        learner_summaries.append(
            {
                "id": f"l{learner.id}",
                "name": learner.full_name,
                "nativeLanguage": learner.native_language or "Unknown",
                "goal": "General English",
                "level": level,
            }
        )

    return TutorDashboardResponse(
        tutor={
            "name": current_user.full_name,
            "role": "Tutor",
            "unread": unread,
        },
        next=next_session,
        learners=learner_summaries,
        today=today.isoformat(),
        sessions=sessions,
    )