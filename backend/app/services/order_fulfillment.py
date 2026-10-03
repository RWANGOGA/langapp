from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.package import Order, OrderStatus
from app.models.user import TutorProfile, User, UserRole
from app.services.notifications import notify_admins, notify_user


async def match_paid_student(db: AsyncSession, order: Order) -> bool:
    """Assign one approved tutor, or leave the paid order awaiting a match."""
    if not order.user_id:
        order.status = OrderStatus.MATCHING_PENDING
        await notify_admins(
            db,
            "matching_failed",
            "Paid student needs tutor matching",
            f"Order #{order.id} was paid, but its student has no valid account owner.",
        )
        return False

    student = await db.scalar(select(User).where(User.id == order.user_id).with_for_update())
    if not student:
        order.status = OrderStatus.MATCHING_PENDING
        await notify_admins(db, "matching_failed", "Paid student could not be matched", f"Order #{order.id} references a missing student.")
        return False

    if student.tutor_id:
        order.status = OrderStatus.COMPLETED
        return True

    tutor = await db.scalar(
        select(User)
        .options(selectinload(User.tutor_profile))
        .join(TutorProfile, TutorProfile.user_id == User.id)
        .where(
            User.role == UserRole.TUTOR,
            User.is_active.is_(True),
            TutorProfile.is_approved.is_(True),
        )
        .order_by(User.id)
    )

    if not tutor:
        order.status = OrderStatus.MATCHING_PENDING
        await notify_user(
            db,
            student.id,
            "matching_pending",
            "Payment received, tutor matching in progress",
            "Your payment succeeded, but we could not find an available tutor yet. We will notify you when your match is ready.",
        )
        await notify_admins(
            db,
            "matching_failed",
            "System could not match a paid student",
            f"Order #{order.id} for {student.full_name} is paid but has no eligible tutor.",
        )
        return False

    student.tutor_id = tutor.id
    order.status = OrderStatus.COMPLETED
    await notify_user(db, student.id, "tutor_assigned", "Your tutor has been assigned", f"{tutor.full_name} is now your Nile Language tutor.")
    await notify_user(db, tutor.id, "learner_assigned", "A learner has been assigned to you", f"{student.full_name} is now one of your Nile Language learners.")
    await notify_admins(db, "assignment_created", "Automatic tutor assignment completed", f"{student.full_name} was assigned to {tutor.full_name} after order #{order.id}.")
    return True