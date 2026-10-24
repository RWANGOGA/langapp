from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.time import utc_now, to_utc_iso
from app.db.session import get_db
from app.models.user import User, Class, ClassStatus
from app.api.auth import get_current_active_user
from app.schemas.learner import LearnerDashboardResponse
from app.schemas.tutor_sessions import SessionActionResponse
from app.models.notification import Notification
from app.services.notifications import notify_user

router = APIRouter()


class LearnerCancelRequest(BaseModel):
    reason: str | None = Field(None, max_length=500)


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
    now = utc_now()
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
            "startsAt": to_utc_iso(next_class.scheduled_at),
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
        "today": utc_now().date().isoformat(),
        "classes": [
            {
                "id": c.id,
                "date": c.scheduled_at.date().isoformat(),
                "time": c.scheduled_at.strftime("%H:%M"),
                "startsAt": to_utc_iso(c.scheduled_at),
                "title": c.title,
            }
            for c in classes
        ],
    }


@router.post("/learner/sessions/{class_id}/cancel", response_model=SessionActionResponse)
async def cancel_class(
    class_id: int,
    payload: LearnerCancelRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Learner cancels their own upcoming class.

    Global-marketplace policy: never after the class started, and inside
    the 24h window a reason is required so the tutor can judge it.
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only learners can cancel their classes",
        )

    result = await db.execute(
        select(Class).where(Class.id == class_id, Class.learner_id == current_user.id)
    )
    cls = result.scalar_one_or_none()
    if not cls:
        # 404, not 403: don't confirm class existence to non-owners.
        raise HTTPException(status_code=404, detail="Class not found")

    if cls.status != ClassStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Class is '{cls.status.value}', only 'scheduled' classes can be cancelled",
        )

    now = utc_now()
    if cls.scheduled_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This class has already started",
        )
    reason = payload.reason.strip() if payload.reason else None
    if cls.scheduled_at - now < timedelta(hours=24) and not reason:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancellations within 24 hours require a reason",
        )

    cls.status = ClassStatus.CANCELLED
    reason_line = f" Reason: {reason}" if reason else ""
    await notify_user(
        db,
        cls.tutor_id,
        "class_cancelled",
        f"Class cancelled by {current_user.full_name}",
        f"{current_user.full_name} cancelled '{cls.title}' (scheduled at "
        f"{to_utc_iso(cls.scheduled_at)} UTC).{reason_line}",
    )

    await db.commit()
    await db.refresh(cls)
    return SessionActionResponse(
        class_id=cls.id,
        status=cls.status,
        starts_at=to_utc_iso(cls.scheduled_at),
        zoom_url=cls.zoom_url,
        meet_url=cls.meet_url,
        notes=cls.notes,
        updated_at=to_utc_iso(cls.updated_at or now),
    )