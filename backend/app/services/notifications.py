from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User, UserRole


async def notify_user(
    db: AsyncSession,
    recipient_id: int,
    notification_type: str,
    title: str,
    message: str,
) -> None:
    db.add(Notification(
        recipient_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
    ))


async def notify_admins(
    db: AsyncSession,
    notification_type: str,
    title: str,
    message: str,
) -> None:
    result = await db.execute(select(User.id).where(User.role == UserRole.ADMIN, User.is_active))
    for admin_id in result.scalars().all():
        await notify_user(db, admin_id, notification_type, title, message)


def mark_read(notification: Notification) -> None:
    notification.is_read = True
    notification.read_at = datetime.utcnow()