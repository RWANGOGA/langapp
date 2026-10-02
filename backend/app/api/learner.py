from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User, Class, ClassStatus
from app.api.auth import get_current_active_user
from app.schemas.learner import LearnerDashboardResponse
from app.models.notification import Notification

router = APIRouter()


@router.get("/learner/dashboard", response_model=LearnerDashboardResponse)
async def get_learner_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only learners can access this endpoint",
        )

    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    unread = unread_result.scalar() or 0

    # Get learner's assigned tutor
    tutor = None
    tutor_profile = None
    if current_user.tutor_id:
        tutor_result = await db.execute(
            select(User)
            .options(selectinload(User.tutor_profile))
            .where(User.id == current_user.tutor_id)
        )
        tutor = tutor_result.scalar_one_or_none()
        if tutor:
            tutor_profile = tutor.tutor_profile

    # Get next upcoming class
    now = datetime.utcnow()
    next_class_result = await db.execute(
        select(Class)
        .where(
            and_(
                Class.learner_id == current_user.id,
                Class.scheduled_at >= now,
                Class.status == ClassStatus.SCHEDULED,
            )
        )
        .order_by(Class.scheduled_at.asc())
        .limit(1)
    )
    next_class = next_class_result.scalar_one_or_none()

    # Get all scheduled classes for the calendar
    classes_result = await db.execute(
        select(Class)
        .where(
            and_(
                Class.learner_id == current_user.id,
                Class.status == ClassStatus.SCHEDULED,
                Class.scheduled_at >= now,
            )
        )
        .order_by(Class.scheduled_at.asc())
    )
    classes = classes_result.scalars().all()

    # Build response
    tutor_data = None
    if tutor:
        tutor_data = {
            "name": tutor.full_name,
            "country": tutor_profile.country if tutor_profile else "Unknown",
            "avatar": tutor.avatar_url,
        }

    next_class_data = None
    if next_class:
        seconds_left = int((next_class.scheduled_at - now).total_seconds())
        next_class_data = {
            "title": next_class.title,
            "secondsLeft": max(0, seconds_left),
            "zoomUrl": next_class.zoom_url,
            "meetUrl": next_class.meet_url,
            "packageName": next_class.package_name,
        }

    return {
        "learner": {
            "name": current_user.full_name,
            "level": current_user.proficiency_level.value if current_user.proficiency_level else "B1",
            "avatar": current_user.avatar_url,
            "unread": unread,
        },
        "tutor": tutor_data,
        "nextClass": next_class_data,
        "progress": {
            "percent": 0,
            "level": current_user.proficiency_level.value if current_user.proficiency_level else "Not set",
            "completed": 0,
            "total": 0,
        },
        "today": datetime.utcnow().date().isoformat(),
        "classes": [
            {"date": c.scheduled_at.date().isoformat(), "time": c.scheduled_at.strftime("%H:%M"), "title": c.title}
            for c in classes
        ],
    }