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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import require_admin
from app.db.session import get_db
from app.models.package import Order, OrderStatus
from app.models.payment_tracking import PaymentEvent
from app.models.user import User
from app.schemas.package import PaymentConfirmation, PaymentConfirmationResult
from app.services.checkout_regions import order_charge
from app.services.order_fulfillment import match_paid_student

router = APIRouter()

# An order in either state has already been paid for.
PAID_STATES = (OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING)
# Money that was given back cannot be received again on the same order.
UNPAYABLE_STATES = (OrderStatus.REFUNDED,)


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
