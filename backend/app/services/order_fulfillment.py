from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.package import Package, Order, OrderStatus
from app.models.payment_tracking import Subscription, SubscriptionStatus
from app.models.user import User
from app.services.notifications import notify_admins, notify_user
from app.services.tutor_matching import rank_tutors_for_learner, record_placement


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

    # The engine ranks every eligible tutor on language, subject, shared
    # working hours and load - the first row the database happened to offer is
    # not a match, it is a queue position. The runner-up list is what the
    # admin queue reads when a human wants to see the thinking.
    ranked = await rank_tutors_for_learner(db, student, order)

    if not ranked:
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

    best = ranked[0]
    tutor = best.tutor
    student.tutor_id = tutor.id
    # Auto-matching places the learner too, so it stamps the same fact the
    # admin assignment records - when the placement happened.
    student.tutor_assigned_at = datetime.utcnow()
    # And the part a manual assignment could skip: the evidence. Who decided
    # (the engine, nobody), and why, in the sentences the score was built from.
    record_placement(
        db, student, tutor,
        source="auto", decided_by=None,
        score=best.score, reasons=best.reasons,
        order_id=order.id,
    )
    order.status = OrderStatus.COMPLETED
    package = await db.scalar(select(Package).where(Package.id == order.package_id))
    if package:
        started_at = datetime.utcnow()
        end_at = started_at + timedelta(days=max(1, package.months) * 30)
        db.add(Subscription(
            user_id=student.id,
            order_id=order.id,
            tier="monthly" if package.months == 1 else "annual" if package.months >= 12 else "bundle",
            status=SubscriptionStatus.ACTIVE,
            started_at=started_at,
            current_period_end=end_at,
            next_renewal_at=end_at if package.months in (1, 12) else None,
        ))
    await notify_user(db, student.id, "tutor_assigned", "Your tutor has been assigned", f"{tutor.full_name} is now your Nile Language tutor.")
    await notify_user(db, tutor.id, "learner_assigned", "A learner has been assigned to you", f"{student.full_name} is now one of your Nile Language learners.")
    await notify_admins(db, "assignment_created", "Automatic tutor assignment completed", f"{student.full_name} was assigned to {tutor.full_name} after order #{order.id}. Reasons: " + "; ".join(best.reasons))
    return True