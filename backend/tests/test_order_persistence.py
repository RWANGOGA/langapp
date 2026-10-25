"""Orders could never be written.

The Postgres types were created from the Python enum *values* ("completed",
"card", "active"), but the models bound the enum *names* ("COMPLETED", "CARD"),
so every insert and every status filter raised InvalidTextRepresentationError.
The orders table was empty, checkout could not persist, and the admin payment
panel returned 500 on its first query.

Under test: the enum types bind their values, and an order survives a round
trip with "completed" on disk rather than "COMPLETED".
"""
import pytest
from sqlalchemy import select, text

from app.models.package import Order, OrderStatus, Package, PaymentMethod
from app.models.payment_tracking import Subscription, SubscriptionStatus
from tests.sqlite_fixtures import db_session  # noqa: F401


class TestEnumStorage:
    def test_enum_types_bind_the_values_the_database_stores(self):
        assert Order.__table__.c.status.type.enums == [status.value for status in OrderStatus]
        assert Order.__table__.c.payment_method.type.enums == [method.value for method in PaymentMethod]
        assert Subscription.__table__.c.status.type.enums == [state.value for state in SubscriptionStatus]

    @pytest.mark.asyncio
    async def test_an_order_round_trips_with_the_lowercase_value(self, db_session):
        db_session.add(Package(
            id="starter",
            name="Starter",
            months=1,
            price_jpy=15000,
            price_vnd=2500000,
            price_usd=99,
            features=[],
        ))
        await db_session.commit()

        order = Order(
            package_id="starter",
            user_id=None,
            status=OrderStatus.COMPLETED,
            payment_method=PaymentMethod.MOBILE_MONEY,
            amount_jpy=15000,
            amount_vnd=2500000,
            amount_usd=99,
        )
        db_session.add(order)
        await db_session.commit()

        found = await db_session.scalar(select(Order).where(Order.status == OrderStatus.COMPLETED))
        assert found is not None, "a completed order must be findable by its own status"

        stored = await db_session.execute(text("SELECT status, payment_method FROM orders"))
        assert stored.all() == [("completed", "mobile_money")], (
            "the on-disk label has to match the Postgres enum, which was built from these values"
        )
