from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timedelta, date

from app.db.session import get_db
from app.models.user import User, UserRole, TutorProfile, Class, ClassStatus
from app.models.notification import Notification
from app.schemas.tutor_dashboard import TutorDashboardResponse
from app.api.auth import get_current_user

router = APIRouter()


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

    today = date.today()
    now = datetime.now()

    # Get today's classes for this tutor
    classes_result = await db.execute(
        select(Class)
        .options(selectinload(Class.learner))
        .where(
            and_(
                Class.tutor_id == current_user.id,
                func.date(Class.scheduled_at) == today,
            )
        )
        .order_by(Class.scheduled_at.asc())
    )
    today_classes = classes_result.scalars().all()

    # Get all learners assigned to this tutor
    learners_result = await db.execute(
        select(User)
        .where(User.tutor_id == current_user.id)
        .options(selectinload(User.classes))
    )
    learners = learners_result.scalars().all()

    # Build sessions list from classes
    sessions = []
    for cls in today_classes:
        sessions.append(
            {
                "id": f"s{cls.id}",
                "date": cls.scheduled_at.date().isoformat(),
                "time": cls.scheduled_at.strftime("%H:%M"),
                "learner": cls.learner.full_name if cls.learner else "Unknown",
                "topic": cls.title,
                "provider": "Zoom" if cls.zoom_url else ("Google Meet" if cls.meet_url else None),
                "meetingUrl": cls.zoom_url or cls.meet_url,
            }
        )

    # Find next upcoming session
    upcoming_classes_result = await db.execute(
        select(Class)
        .options(selectinload(Class.learner))
        .where(
            and_(
                Class.tutor_id == current_user.id,
                Class.scheduled_at >= now,
                Class.status == ClassStatus.SCHEDULED,
            )
        )
        .order_by(Class.scheduled_at.asc())
        .limit(1)
    )
    next_class = upcoming_classes_result.scalar_one_or_none()

    if next_class:
        seconds_left = int((next_class.scheduled_at - now).total_seconds())
        next_session = {
            "sessionId": f"s{next_class.id}",
            "learner": next_class.learner.full_name if next_class.learner else "Unknown",
            "topic": next_class.title,
            "secondsLeft": max(0, seconds_left),
            "meetingUrl": next_class.zoom_url or next_class.meet_url,
        }
    else:
        next_session = {
            "sessionId": "none",
            "learner": "No upcoming sessions",
            "topic": "—",
            "secondsLeft": 0,
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