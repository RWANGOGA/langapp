import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.session import get_db
from app.models.package import Package, Order, PlanName, PaymentMethod, OrderStatus
from app.models.payment_tracking import PaymentEvent
from app.schemas.package import PackageRead, PackageCreate, OrderCreate, OrderRead, PaymentWebhook
from app.api.auth import get_current_active_user
from app.models.user import User
from app.core.config import settings
from app.services.order_fulfillment import match_paid_student

router = APIRouter()


@router.get("/packages", response_model=List[PackageRead])
async def get_packages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Package).order_by(Package.months))
    packages = result.scalars().all()
    return packages


@router.get("/packages/{package_id}", response_model=PackageRead)
async def get_package(package_id: PlanName, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_checkout(
    order_in: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.value != "student":
        raise HTTPException(status_code=403, detail="Only students can create checkout orders")

    # Get package
    result = await db.execute(select(Package).where(Package.id == order_in.package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # Create order
    order = Order(
        package_id=package.id,
        user_id=current_user.id,
        subject=order_in.subject,
        session_type=order_in.session_type,
        duration_minutes=order_in.duration_minutes,
        status=OrderStatus.PENDING,
        payment_method=order_in.payment_method,
        amount_jpy=package.price_jpy,
        amount_vnd=package.price_vnd,
        amount_usd=package.price_usd,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order


@router.get("/checkout/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="You cannot view this order")
    return order


@router.post("/payments/webhook", response_model=OrderRead)
async def payment_webhook(
    event: PaymentWebhook,
    request: Request,
    webhook_signature: str | None = Header(None, alias="X-Payment-Signature"),
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    expected = hmac.new((settings.PAYMENT_WEBHOOK_SECRET or "").encode(), body, hashlib.sha256).hexdigest()
    if not settings.PAYMENT_WEBHOOK_SECRET or not webhook_signature or not hmac.compare_digest(webhook_signature, expected):
        raise HTTPException(status_code=401, detail="Invalid payment webhook")

    order = await db.scalar(select(Order).where(Order.id == event.order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in {OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING}:
        return order

    duplicate = await db.scalar(select(PaymentEvent).where(PaymentEvent.provider_event_id == event.provider_event_id))
    if duplicate:
        return order

    order.external_payment_id = event.external_payment_id
    if event.status != "succeeded":
        order.status = OrderStatus.FAILED
    else:
        await match_paid_student(db, order)
    db.add(PaymentEvent(
        event_type=f"payment.{event.status}",
        actor_type="provider",
        user_id=order.user_id,
        order_id=order.id,
        provider_event_id=event.provider_event_id,
        previous_state=OrderStatus.PENDING.value,
        new_state=order.status.value,
        amount_minor=order.amount_usd,
        currency="USD",
        summary=f"Payment provider reported {event.status} for order #{order.id}.",
        metadata_json={"external_payment_id": event.external_payment_id},
    ))
    await db.commit()
    await db.refresh(order)
    return order