from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User, UserRole


# Where a notification should send its reader, keyed by what happened and who
# is seeing it. The same event lands differently per role: a scheduled class
# opens a learner's dashboard but the tutor's schedule. Types with no surface
# that actually resolves them are left out and store a null link, so the row
# stays honest text instead of a button to the wrong page.
_LINKS: dict[str, dict[UserRole, str]] = {
    "contact_message": {UserRole.ADMIN: "/admin/messages"},
    "contact_reply": {UserRole.STUDENT: "/dashboard", UserRole.TUTOR: "/tutor"},
    "testimonial_written": {UserRole.ADMIN: "/testimonials"},
    "tutor_approved": {UserRole.ADMIN: "/admin/tutors"},
    "tutor_application_approved": {UserRole.TUTOR: "/tutor"},
    "matching_failed": {UserRole.ADMIN: "/admin/students"},
    "matching_pending": {UserRole.STUDENT: "/dashboard"},
    "assignment_created": {UserRole.ADMIN: "/admin/students"},
    "assignment_removed": {UserRole.ADMIN: "/admin/students"},
    "tutor_assigned": {UserRole.STUDENT: "/dashboard/tutors"},
    "tutor_unassigned": {UserRole.STUDENT: "/dashboard/tutors"},
    "learner_assigned": {UserRole.TUTOR: "/tutor/learners"},
    "learner_unassigned": {UserRole.TUTOR: "/tutor/learners"},
    "class_scheduled": {UserRole.STUDENT: "/dashboard", UserRole.TUTOR: "/tutor/schedule"},
    "class_cancelled": {UserRole.STUDENT: "/dashboard", UserRole.TUTOR: "/tutor/schedule"},
    "class_no_show": {UserRole.STUDENT: "/dashboard"},
    "lesson_feedback": {UserRole.STUDENT: "/dashboard/progress"},
}


def link_for(notification_type: str, role: UserRole | None) -> str | None:
    """Relative in-app route for this event and reader, or None if unmapped."""
    if role is None:
        return None
    return _LINKS.get(notification_type, {}).get(role)


async def notify_user(
    db: AsyncSession,
    recipient_id: int,
    notification_type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    # Callers that already know the destination pass it in; otherwise resolve
    # it from the recipient's role, so one event type can land differently for
    # a learner, a tutor, or an admin without every call site repeating itself.
    if link is None:
        role = await db.scalar(select(User.role).where(User.id == recipient_id))
        link = link_for(notification_type, role)
    db.add(Notification(
        recipient_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
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