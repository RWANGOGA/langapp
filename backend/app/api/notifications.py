from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_active_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationRead
from app.services.notifications import mark_read

router = APIRouter()


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    return NotificationListResponse(
        notifications=result.scalars().all(),
        unread=unread_result.scalar() or 0,
    )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
async def read_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    mark_read(notification)
    await db.commit()
    await db.refresh(notification)
    return notification