"""Manual payment confirmation - the only way an order becomes paid.

No payment provider is wired. The single route to a paid order is
`POST /payments/webhook`, which is guarded by PAYMENT_WEBHOOK_SECRET: unset,
with nothing calling it. So an administrator records the money by hand,
quoting the reference it arrived under, and that act has to do everything a
provider callback would have done:

- mark the order paid and keep the region and currency it was charged in
- write the append-only payment event both ledgers read from
- start the subscription and place the student with an approved tutor

Everything here runs on the shared in-memory SQLite harness, never the Neon
database.
"""
import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.package import Order, OrderStatus, Package, PaymentMethod
from app.models.payment_tracking import PaymentEvent, Subscription, SubscriptionStatus
from app.models.user import TutorProfile, User, UserRole
from app.main import app

from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    learner_client,
    make_client,
)

CONFIRM = "/api/v1/admin/payments/{order_id}/confirm"


@pytest_asyncio.fixture
async def admin_user(db_session):
    admin = User(
        email="admin.test@example.com",
        hashed_password="x",
        full_name="Test Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def admin_client(db_session, admin_user):
    async with make_client(db_session, admin_user) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def approved_tutor(db_session, tutor_user):
    db_session.add(TutorProfile(user_id=tutor_user.id, is_approved=True))
    await db_session.commit()
    return tutor_user


@pytest_asyncio.fixture
async def starter_package(db_session):
    package = Package(
        id="starter",
        name="Starter (1-Month)",
        months=1,
        price_jpy=8000,
        price_vnd=1400000,
        price_usd=59,
        features=[],
    )
    db_session.add(package)
    await db_session.commit()
    return package


@pytest_asyncio.fixture
async def pending_order(db_session, learner_user, starter_package):
    order = Order(
        package_id="starter",
        user_id=learner_user.id,
        subject="General English",
        session_type="conversation",
        duration_minutes=60,
        status=OrderStatus.PENDING,
        payment_method=PaymentMethod.LINE_PAY,
        amount_jpy=8000,
        amount_vnd=1400000,
        amount_usd=59,
        region="jp",
        currency="JPY",
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)
    return order


async def confirm(client, order, reference="BT-4471", note=None):
    payload = {"reference": reference}
    if note is not None:
        payload["note"] = note
    return await client.post(CONFIRM.format(order_id=order.id), json=payload)


class TestThePaymentEvent:
    @pytest.mark.asyncio
    async def test_records_the_reference_in_an_append_only_event(self, admin_client, db_session, pending_order):
        response = await confirm(admin_client, pending_order, note="Bank transfer, 12 May")

        assert response.status_code == 200, response.text
        event = await db_session.scalar(
            select(PaymentEvent).where(PaymentEvent.event_type == "payment.manual_confirmed")
        )
        assert event is not None, "a manual confirmation has to leave a payment event behind"
        assert event.order_id == pending_order.id
        assert event.actor_type == "admin"
        assert event.previous_state == "pending"
        assert event.metadata_json["reference"] == "BT-4471"
        assert event.metadata_json["note"] == "Bank transfer, 12 May"

    @pytest.mark.asyncio
    async def test_event_carries_the_currency_the_student_was_charged_in(self, admin_client, db_session, pending_order):
        await confirm(admin_client, pending_order)

        event = await db_session.scalar(
            select(PaymentEvent).where(PaymentEvent.event_type == "payment.manual_confirmed")
        )
        # JPY has no decimal subunit, so the minor unit is the yen itself.
        assert (event.amount_minor, event.currency) == (8000, "JPY")

    @pytest.mark.asyncio
    async def test_keeps_the_reference_on_the_order_for_the_student_receipt(self, admin_client, db_session, pending_order):
        await confirm(admin_client, pending_order, reference="MOMO-99120")

        await db_session.refresh(pending_order)
        assert pending_order.external_payment_id == "MOMO-99120"


class TestFulfilment:
    @pytest.mark.asyncio
    async def test_marks_the_order_paid(self, admin_client, db_session, pending_order):
        response = await confirm(admin_client, pending_order)

        assert response.status_code == 200, response.text
        await db_session.refresh(pending_order)
        assert pending_order.status in {OrderStatus.COMPLETED, OrderStatus.MATCHING_PENDING}

    @pytest.mark.asyncio
    async def test_places_the_student_and_starts_the_subscription(
        self, admin_client, db_session, pending_order, approved_tutor, learner_user
    ):
        response = await confirm(admin_client, pending_order)

        assert response.status_code == 200, response.text
        await db_session.refresh(pending_order)
        assert pending_order.status == OrderStatus.COMPLETED
        await db_session.refresh(learner_user)
        assert learner_user.tutor_id == approved_tutor.id, "a paid student must end up with a tutor"

        subscription = await db_session.scalar(
            select(Subscription).where(Subscription.order_id == pending_order.id)
        )
        assert subscription is not None, "paying for a package must open the subscription"
        assert subscription.status == SubscriptionStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_with_no_approved_tutor_the_order_waits_for_matching(self, admin_client, db_session, pending_order):
        response = await confirm(admin_client, pending_order)

        assert response.status_code == 200, response.text
        await db_session.refresh(pending_order)
        assert pending_order.status == OrderStatus.MATCHING_PENDING


class TestGuards:
    @pytest.mark.asyncio
    async def test_the_reference_is_required(self, admin_client, db_session, pending_order):
        response = await confirm(admin_client, pending_order, reference="")

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_only_an_admin_may_confirm(self, learner_client, db_session, pending_order):
        response = await confirm(learner_client, pending_order)

        assert response.status_code == 403, "a student must not be able to mark their own order paid"
        events = await db_session.scalar(select(PaymentEvent).where(PaymentEvent.order_id == pending_order.id))
        assert events is None

    @pytest.mark.asyncio
    async def test_an_order_cannot_be_confirmed_twice(self, admin_client, db_session, pending_order):
        first = await confirm(admin_client, pending_order)
        assert first.status_code == 200, first.text

        second = await confirm(admin_client, pending_order)
        assert second.status_code == 409, "confirming twice would double-count the money and the subscription"

    @pytest.mark.asyncio
    async def test_a_refunded_order_cannot_be_confirmed(self, admin_client, db_session, pending_order):
        pending_order.status = OrderStatus.REFUNDED
        await db_session.commit()

        response = await confirm(admin_client, pending_order)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_an_unknown_order_is_not_found(self, admin_client):
        response = await admin_client.post(CONFIRM.format(order_id=999999), json={"reference": "BT-1"})

        assert response.status_code == 404


class TestCheckoutKeepsTheRegion:
    @pytest.mark.asyncio
    async def test_the_order_stores_the_region_and_currency_it_was_charged_in(
        self, learner_client, db_session, starter_package
    ):
        response = await learner_client.post(
            "/api/v1/checkout",
            json={
                "package_id": "starter",
                "region": "vn",
                "payment_method": "momo",
                "subject": "General English",
                "session_type": "conversation",
                "duration_minutes": 60,
            },
        )

        assert response.status_code == 201, response.text
        order = await db_session.scalar(select(Order).order_by(Order.id.desc()).limit(1))
        assert (order.region, order.currency) == ("vn", "VND"), (
            "the ledger has to know which currency the money actually arrived in"
        )
