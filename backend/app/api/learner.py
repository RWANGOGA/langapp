from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User, UserRole, Class, ClassStatus, TutorProfile
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
            )
        )
        .order_by(Class.scheduled_at.asc())
    )
    classes = classes_result.scalars().all()

    # Calculate progress (mock for now - would need unit tracking)
    # In a real implementation, this would track completed units from curriculum
    completed_units = 18
    total_units = 25
    progress_percent = int((completed_units / total_units) * 100) if total_units > 0 else 0

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
        if seconds_left < 0:
            seconds_left = 0
        next_class_data = {
            "title": next_class.title,
            "secondsLeft": max(0, seconds_left),
            "zoomUrl": next_class.zoom_url or "https://zoom.us/",
            "meetUrl": next_class.meet_url or "https://meet.google.com/",
            "packageName": next_class.package_name or "Package",
        }

    # Get current date in YYYY-MM-DD format (UTC)
    today = datetime.utcnow().date().isoformat()

    # Format classes for calendar
    class_items = [
        {
            "date": c.scheduled_at.date().isoformat(),
            "time": c.scheduled_at.strftime("%H:%M"),
            "title": c.title,
        }
        for c in classes
    ]

    return {
        "learner": {
            "name": current_user.full_name,
            "level": current_user.proficiency_level.value if current_user.proficiency_level else "B1",
            "avatar": current_user.avatar_url,
            "unread": unread,
        },
        "tutor": tutor_data or {
            "name": "Sarah J.",
            "country": "USA",
            "avatar": "/tutor-sarah.png",
        },
        "nextClass": next_class_data or {
            "title": "General English: Unit 7 - Conversation Practice",
            "secondsLeft": 15 * 60 + 32,
            "zoomUrl": "https://zoom.us/",
            "meetUrl": "https://meet.google.com/",
            "packageName": "3-Month Intensive Package",
        },
        "progress": {
            "percent": 72,
            "level": "B2",
            "completed": 18,
            "total": 25,
        },
        "today": datetime.utcnow().date().isoformat(),
        "classes": [
            {"date": c.scheduled_at.date().isoformat(), "time": c.scheduled_at.strftime("%H:%M"), "title": c.title}
            for c in classes
        ],
    }