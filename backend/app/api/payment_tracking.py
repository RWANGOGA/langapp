from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_active_user, require_admin
from app.db.session import get_db
from app.models.package import Order, OrderStatus, Package
from app.models.payment_tracking import PaymentEvent, Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.package import PaymentHistoryItem, PaymentSummary

router = APIRouter()


async def _latest_order(db: AsyncSession, user_id: int) -> Order | None:
    return await db.scalar(
        select(Order)
        .options(selectinload(Order.package))
        .where(Order.user_id == user_id)
        .order_by(desc(Order.created_at))
        .limit(1)
    )


@router.get("/me/payment-summary", response_model=PaymentSummary)
async def get_payment_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    order = await _latest_order(db, current_user.id)
    subscription = await db.scalar(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(desc(Subscription.created_at)).limit(1)
    )
    if not order:
        return PaymentSummary(status="unpaid")
    return PaymentSummary(
        status="paid" if order.status in {OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING} else order.status.value,
        package_name=order.package.name if order.package else None,
        subject=order.subject,
        tier=subscription.tier if subscription else None,
        started_at=subscription.started_at if subscription else None,
        expires_at=subscription.current_period_end if subscription else None,
        renews_at=subscription.next_renewal_at if subscription else None,
        amount=order.amount_usd,
        currency="USD",
        fulfillment_status=order.status.value,
    )


@router.get("/me/payments", response_model=list[PaymentHistoryItem])
async def get_my_payments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=25, ge=1, le=100),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.package))
        .where(Order.user_id == current_user.id)
        .order_by(desc(Order.created_at))
        .limit(limit)
    )
    return [
        PaymentHistoryItem(
            order_id=order.id,
            package_name=order.package.name if order.package else None,
            status=order.status.value,
            amount_jpy=order.amount_jpy,
            amount_vnd=order.amount_vnd,
            amount_usd=order.amount_usd,
            payment_method=order.payment_method,
            created_at=order.created_at,
        )
        for order in result.scalars().all()
    ]


@router.post("/me/subscription/cancel")
async def cancel_my_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subscription = await db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        ).order_by(desc(Subscription.created_at)).limit(1)
    )
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelled_at = datetime.utcnow()
    db.add(PaymentEvent(
        event_type="subscription.cancelled",
        actor_type="student",
        actor_id=current_user.id,
        user_id=current_user.id,
        order_id=subscription.order_id,
        previous_state="active",
        new_state="cancelled",
        summary="Student cancelled future subscription renewal.",
        metadata_json={},
    ))
    await db.commit()
    return {"status": "cancelled", "access_until": subscription.current_period_end}


@router.get("/tutor/payment-summary")
async def get_tutor_payment_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")
    result = await db.execute(
        select(User.id, User.full_name, Order.subject, Order.status, Order.created_at, Package.name, Subscription.tier, Subscription.started_at, Subscription.current_period_end)
        .join(Order, Order.user_id == User.id)
        .join(Package, Package.id == Order.package_id)
        .outerjoin(Subscription, Subscription.order_id == Order.id)
        .where(User.tutor_id == current_user.id)
        .order_by(desc(Order.created_at))
    )
    return [
        {"student_id": row.id, "student_name": row.full_name, "subject": row.subject, "package_name": row.name, "tier": row.tier, "status": row.status.value, "started_at": row.started_at or row.created_at, "expires_at": row.current_period_end}
        for row in result.all()
    ]


@router.get("/admin/payment/activity")
async def get_payment_activity(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
):
    result = await db.execute(select(PaymentEvent).order_by(desc(PaymentEvent.created_at)).limit(limit))
    return [
        {"id": event.id, "event_type": event.event_type, "summary": event.summary, "new_state": event.new_state, "amount": event.amount_minor, "currency": event.currency, "created_at": event.created_at}
        for event in result.scalars().all()
    ]


@router.get("/admin/payment/analytics")
async def get_payment_analytics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    successful = await db.scalar(select(func.count(Order.id)).where(Order.status.in_([OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING]))) or 0
    matching_pending = await db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.MATCHING_PENDING)) or 0
    revenue = await db.scalar(select(func.coalesce(func.sum(Order.amount_usd), 0)).where(Order.status.in_([OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING]))) or 0
    active_subscriptions = await db.scalar(select(func.count(Subscription.id)).where(Subscription.status == "active")) or 0
    return {"successful_payments": successful, "matching_pending": matching_pending, "gross_revenue_usd": revenue, "active_subscriptions": active_subscriptions, "generated_at": datetime.utcnow()}