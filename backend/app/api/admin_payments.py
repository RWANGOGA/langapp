"""Recording money, and the ledger that builds up from it.

Nothing else in the system can mark an order paid. The webhook route needs a
signed callback from a provider, no provider is wired and its secret is unset,
so revenue only becomes real here: one administrator, one reference, one
payment event.

Confirming is deliberately the same act as fulfilling. A payment that marks an
order paid but leaves the student without a tutor would be a receipt for
something that did not happen, so the confirmation runs the same service a
provider callback would.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, case, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.auth import require_admin
from app.db.session import get_db
from app.models.package import Order, OrderStatus, Package
from app.models.payment_tracking import PaymentEvent, Subscription
from app.models.user import User
from app.schemas.admin_payments import (
    CurrencyTotal,
    LedgerEvent,
    LedgerOrder,
    LedgerPage,
    LedgerRow,
    LedgerSubscription,
    LedgerSummary,
)
from app.schemas.package import PaymentConfirmation, PaymentConfirmationResult
from app.services.checkout_regions import MINOR_UNITS, charge_of, order_charge
from app.services.order_fulfillment import match_paid_student

router = APIRouter()

# An order in either state has already been paid for.
PAID_STATES = (OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING)
# Money that was given back cannot be received again on the same order.
UNPAYABLE_STATES = (OrderStatus.REFUNDED,)

# The newest moment this order was recorded as paid. One order can only be paid
# once, but reading the event keeps the column honest even if a refund and a
# second charge ever exist.
PAID_AT = (
    select(func.max(PaymentEvent.created_at))
    .where(PaymentEvent.order_id == Order.id, PaymentEvent.new_state == "paid")
    .correlate(Order)
    .scalar_subquery()
)


def _row(row) -> LedgerRow:
    amount_minor, currency = charge_of(row.currency, row.amount_jpy, row.amount_vnd, row.amount_usd)
    return LedgerRow(
        order_id=row.order_id,
        student_id=row.student_id,
        student_name=row.student_name,
        student_email=row.student_email,
        package_id=row.package_id,
        package_name=row.package_name,
        status=row.status.value,
        region=row.region,
        currency=currency,
        amount_minor=amount_minor,
        payment_method=row.payment_method.value if row.payment_method else None,
        reference=row.reference,
        created_at=row.created_at,
        paid_at=row.paid_at,
    )


@router.get("", response_model=LedgerPage)
async def get_ledger(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status: Optional[OrderStatus] = Query(default=None),
    currency: Optional[str] = Query(default=None),
    search: str = Query(default="", max_length=80),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
):
    """One page of the order ledger, with the filters an administrator uses.

    The totals are computed over every paid order, not just this page, because
    "what has come in" is not a question about whichever 25 rows are visible.
    """
    if currency is not None and currency not in MINOR_UNITS:
        raise HTTPException(status_code=422, detail=f"Unknown currency '{currency}'")

    filters = []
    if status is not None:
        filters.append(Order.status == status)
    if currency is not None:
        filters.append(Order.currency == currency)
    if search.strip():
        term = f"%{search.strip()}%"
        conditions = [
            User.full_name.ilike(term),
            User.email.ilike(term),
            Order.external_payment_id.ilike(term),
        ]
        if search.strip().isdigit():
            conditions.append(cast(Order.id, String) == search.strip())
        filters.append(or_(*conditions))

    base = (
        select(
            Order.id.label("order_id"),
            Order.status.label("status"),
            Order.region.label("region"),
            Order.currency.label("currency"),
            Order.amount_jpy,
            Order.amount_vnd,
            Order.amount_usd,
            Order.payment_method.label("payment_method"),
            Order.external_payment_id.label("reference"),
            Order.created_at.label("created_at"),
            User.id.label("student_id"),
            User.full_name.label("student_name"),
            User.email.label("student_email"),
            Package.id.label("package_id"),
            Package.name.label("package_name"),
            PAID_AT.label("paid_at"),
        )
        .join(User, User.id == Order.user_id, isouter=True)
        .join(Package, Package.id == Order.package_id)
        .where(*filters)
    )

    # Counted without the PAID_AT column: the correlated subquery in the row
    # query would otherwise run once per order just to be discarded.
    total = await db.scalar(
        select(func.count(Order.id))
        .select_from(Order)
        .join(User, User.id == Order.user_id, isouter=True)
        .join(Package, Package.id == Order.package_id)
        .where(*filters)
    ) or 0
    rows = await db.execute(
        base.order_by(desc(Order.created_at), desc(Order.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    # Summed per currency: adding yen to dong would produce a number that is
    # not money in any country.
    currency_expr = func.coalesce(Order.currency, "USD")
    amount_expr = case(
        (Order.currency == "JPY", Order.amount_jpy),
        (Order.currency == "VND", Order.amount_vnd),
        else_=Order.amount_usd * 100,
    )
    collected_rows = await db.execute(
        select(currency_expr, func.sum(amount_expr), func.count(Order.id))
        .where(Order.status.in_(PAID_STATES))
        .group_by(currency_expr)
        .order_by(currency_expr)
    )

    # One grouped read for the three headline counts. Three separate COUNTs read
    # the same rows three times, and each one is a full round trip to the
    # database.
    status_rows = await db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    )
    status_counts = {state: count for state, count in status_rows.all()}

    summary = LedgerSummary(
        awaiting_payment=status_counts.get(OrderStatus.PENDING, 0),
        awaiting_match=status_counts.get(OrderStatus.MATCHING_PENDING, 0),
        paid=sum(status_counts.get(state, 0) for state in PAID_STATES),
        collected=[
            CurrencyTotal(currency=c, amount_minor=int(amount or 0), count=n)
            for c, amount, n in collected_rows.all()
        ],
    )

    return LedgerPage(
        orders=[_row(row) for row in rows.all()],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
        summary=summary,
    )


@router.get("/{order_id}", response_model=LedgerOrder)
async def get_ledger_order(
    order_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Everything that happened to one order: the charge, the events, the term."""
    row = (
        await db.execute(
            select(
                Order.id.label("order_id"),
                Order.status.label("status"),
                Order.region.label("region"),
                Order.currency.label("currency"),
                Order.amount_jpy,
                Order.amount_vnd,
                Order.amount_usd,
                Order.payment_method.label("payment_method"),
                Order.external_payment_id.label("reference"),
                Order.created_at.label("created_at"),
                Order.subject,
                Order.session_type,
                Order.duration_minutes,
                User.id.label("student_id"),
                User.full_name.label("student_name"),
                User.email.label("student_email"),
                Package.id.label("package_id"),
                Package.name.label("package_name"),
                Package.months.label("package_months"),
                PAID_AT.label("paid_at"),
            )
            .join(User, User.id == Order.user_id, isouter=True)
            .join(Package, Package.id == Order.package_id)
            .where(Order.id == order_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")

    tutor_name = None
    if row.student_id is not None:
        tutor = aliased(User)
        tutor_name = await db.scalar(
            select(tutor.full_name)
            .join(User, User.tutor_id == tutor.id)
            .where(User.id == row.student_id)
        )

    events = await db.execute(
        select(PaymentEvent)
        .where(PaymentEvent.order_id == order_id)
        .order_by(desc(PaymentEvent.created_at), desc(PaymentEvent.id))
    )
    subscription = await db.scalar(
        select(Subscription)
        .where(Subscription.order_id == order_id)
        .order_by(desc(Subscription.created_at))
        .limit(1)
    )

    return LedgerOrder(
        **_row(row).model_dump(),
        subject=row.subject,
        session_type=row.session_type,
        duration_minutes=row.duration_minutes,
        package_months=row.package_months,
        tutor_name=tutor_name,
        events=[
            LedgerEvent(
                id=event.id,
                event_type=event.event_type,
                actor_type=event.actor_type,
                previous_state=event.previous_state,
                new_state=event.new_state,
                amount_minor=event.amount_minor,
                currency=event.currency,
                summary=event.summary,
                reference=(event.metadata_json or {}).get("reference"),
                note=(event.metadata_json or {}).get("note"),
                created_at=event.created_at,
            )
            for event in events.scalars().all()
        ],
        subscription=(
            LedgerSubscription(
                tier=subscription.tier,
                status=subscription.status.value,
                started_at=subscription.started_at,
                current_period_end=subscription.current_period_end,
                cancelled_at=subscription.cancelled_at,
            )
            if subscription
            else None
        ),
    )


@router.post("/{order_id}/confirm", response_model=PaymentConfirmationResult)
async def confirm_payment(
    order_id: int,
    confirmation: PaymentConfirmation,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # with_for_update serialises two admins confirming the same order at the
    # same moment in Postgres; SQLite ignores the clause, and the event guard
    # below covers the same case on any backend.
    order = await db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    previous_state = order.status.value
    if order.status in PAID_STATES:
        raise HTTPException(status_code=409, detail="This payment is already recorded")
    if order.status in UNPAYABLE_STATES:
        raise HTTPException(status_code=409, detail=f"A {previous_state} order cannot be confirmed")

    already = await db.scalar(
        select(PaymentEvent.id).where(
            PaymentEvent.order_id == order.id,
            PaymentEvent.event_type == "payment.manual_confirmed",
        )
    )
    if already is not None:
        raise HTTPException(status_code=409, detail="This payment is already recorded")

    amount_minor, currency = order_charge(order)
    confirmed_at = confirmation.paid_at or datetime.utcnow()

    # The reference is what makes the payment findable later, so an order that
    # has never carried a provider id keeps it as its own identifier.
    if not order.external_payment_id:
        order.external_payment_id = confirmation.reference

    event = PaymentEvent(
        event_type="payment.manual_confirmed",
        actor_type="admin",
        actor_id=current_user.id,
        user_id=order.user_id,
        order_id=order.id,
        previous_state=previous_state,
        new_state="paid",
        amount_minor=amount_minor,
        currency=currency,
        summary=(
            f"{amount_minor} {currency} confirmed by {current_user.full_name} "
            f"against reference {confirmation.reference}."
        ),
        metadata_json={"reference": confirmation.reference, "note": confirmation.note},
        created_at=confirmed_at,
    )
    db.add(event)

    matched = await match_paid_student(db, order)
    # Reassign the whole document: JSON columns do not track in-place edits.
    event.metadata_json = {
        **event.metadata_json,
        "fulfilment_status": order.status.value,
    }

    await db.commit()

    return PaymentConfirmationResult(
        order_id=order.id,
        status=order.status,
        amount_minor=amount_minor,
        currency=currency,
        reference=confirmation.reference,
        matched=matched,
        confirmed_at=confirmed_at,
    )
