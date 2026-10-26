"""The admin payment ledger.

One page of orders, the filters an administrator actually uses (which stage the
money is at, which currency it arrived in, whose order it is), the per-currency
totals that make the page worth opening, and the per-order drill-down that
answers "what exactly happened to this payment?".

Totals are the part most likely to lie: an order can be charged in yen, dong or
dollars, so adding the three columns together would produce a number in no
currency at all. Every total is therefore grouped by the currency it was
charged in.
"""
import pytest
from sqlalchemy import select

from app.models.package import OrderStatus, PaymentMethod
from app.models.payment_tracking import PaymentEvent, Subscription, SubscriptionStatus

from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    learner_client,
    admin_user,
    admin_client,
    starter_package,
    make_order,
)

LEDGER = "/api/v1/admin/payments"


async def confirm(client, order, reference="BT-4471"):
    return await client.post(
        f"{LEDGER}/{order.id}/confirm", json={"reference": reference}
    )


class TestListing:
    @pytest.mark.asyncio
    async def test_lists_an_order_with_its_student_and_charge(self, admin_client, make_order):
        order = await make_order()

        response = await admin_client.get(LEDGER)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total"] == 1

        row = body["orders"][0]
        assert row["order_id"] == order.id
        assert row["student_name"] == "Test Learner"
        assert row["package_name"] == "Starter (1-Month)"
        assert (row["amount_minor"], row["currency"]) == (8000, "JPY")
        assert row["status"] == "pending"
        assert row["paid_at"] is None

    @pytest.mark.asyncio
    async def test_a_confirmed_order_reports_when_it_was_paid(self, admin_client, make_order):
        order = await make_order()
        await confirm(admin_client, order)

        row = (await admin_client.get(LEDGER)).json()["orders"][0]
        assert row["status"] in {"completed", "matching_pending"}
        assert row["paid_at"] is not None
        assert row["reference"] == "BT-4471"

    @pytest.mark.asyncio
    async def test_newest_order_first(self, admin_client, make_order):
        older = await make_order()
        newer = await make_order()

        rows = (await admin_client.get(LEDGER)).json()["orders"]
        assert [row["order_id"] for row in rows] == [newer.id, older.id]

    @pytest.mark.asyncio
    async def test_an_order_without_a_student_is_still_listed(self, admin_client, make_order):
        await make_order(user_id=None)

        row = (await admin_client.get(LEDGER)).json()["orders"][0]
        assert row["student_name"] is None
        assert row["order_id"] is not None


class TestFilters:
    @pytest.mark.asyncio
    async def test_filters_by_stage(self, admin_client, make_order):
        await make_order()
        paid = await make_order()
        await confirm(admin_client, paid)

        waiting = (await admin_client.get(f"{LEDGER}?status=pending")).json()
        assert [row["order_id"] for row in waiting["orders"]] == [
            row["order_id"] for row in waiting["orders"] if row["status"] == "pending"
        ]
        assert waiting["total"] == 1

        # With no approved tutor in this fixture a confirmed order stops at
        # matching_pending, which is still "paid" from the ledger's point of view.
        paid_stage = (await admin_client.get(f"{LEDGER}?status=matching_pending")).json()
        assert paid_stage["total"] == 1
        assert paid_stage["orders"][0]["order_id"] == paid.id

    @pytest.mark.asyncio
    async def test_filters_by_currency(self, admin_client, make_order):
        await make_order()
        vietnam = await make_order(
            region="vn", currency="VND", amount_vnd=2400000, payment_method=PaymentMethod.MOMO
        )

        body = (await admin_client.get(f"{LEDGER}?currency=VND")).json()
        assert body["total"] == 1
        assert body["orders"][0]["order_id"] == vietnam.id
        assert body["orders"][0]["amount_minor"] == 2400000

    @pytest.mark.asyncio
    async def test_searches_the_student_name(self, admin_client, make_order):
        await make_order()

        assert (await admin_client.get(f"{LEDGER}?search=Test%20Learner")).json()["total"] == 1
        assert (await admin_client.get(f"{LEDGER}?search=Nobody")).json()["total"] == 0

    @pytest.mark.asyncio
    async def test_searches_the_payment_reference(self, admin_client, make_order):
        order = await make_order()
        await confirm(admin_client, order, reference="MOMO-99120")

        body = (await admin_client.get(f"{LEDGER}?search=MOMO-99120")).json()
        assert body["total"] == 1
        assert body["orders"][0]["order_id"] == order.id

    @pytest.mark.asyncio
    async def test_an_unknown_stage_is_refused(self, admin_client):
        response = await admin_client.get(f"{LEDGER}?status=banana")
        assert response.status_code == 422


class TestTotals:
    @pytest.mark.asyncio
    async def test_totals_arrive_grouped_by_currency(self, admin_client, make_order):
        japan = await make_order()
        await confirm(admin_client, japan)
        vietnam = await make_order(
            region="vn", currency="VND", amount_vnd=2400000, payment_method=PaymentMethod.MOMO
        )
        await confirm(admin_client, vietnam, reference="MOMO-1")

        collected = (await admin_client.get(LEDGER)).json()["summary"]["collected"]
        by_currency = {row["currency"]: row for row in collected}
        assert by_currency["JPY"]["amount_minor"] == 8000
        assert by_currency["VND"]["amount_minor"] == 2400000
        assert by_currency["JPY"]["count"] == 1
        assert by_currency["VND"]["count"] == 1

    @pytest.mark.asyncio
    async def test_unpaid_orders_are_not_counted_as_collected(self, admin_client, make_order):
        await make_order()

        summary = (await admin_client.get(LEDGER)).json()["summary"]
        assert summary["collected"] == []
        assert summary["awaiting_payment"] == 1

    @pytest.mark.asyncio
    async def test_historical_orders_without_a_currency_are_reported_in_usd(self, admin_client, make_order):
        await make_order(region=None, currency=None, status=OrderStatus.COMPLETED)

        collected = (await admin_client.get(LEDGER)).json()["summary"]["collected"]
        assert collected == [{"currency": "USD", "amount_minor": 5900, "count": 1}]


class TestDrillDown:
    @pytest.mark.asyncio
    async def test_shows_the_payment_history_of_one_order(self, admin_client, make_order):
        order = await make_order()
        await confirm(admin_client, order, reference="BT-7188")

        response = await admin_client.get(f"{LEDGER}/{order.id}")
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["order_id"] == order.id
        assert body["student_name"] == "Test Learner"
        assert body["region"] == "jp"
        assert body["events"][0]["event_type"] == "payment.manual_confirmed"
        assert body["events"][0]["reference"] == "BT-7188"
        assert body["events"][0]["amount_minor"] == 8000
        assert body["events"][0]["currency"] == "JPY"

    @pytest.mark.asyncio
    async def test_an_unknown_order_is_not_found(self, admin_client):
        assert (await admin_client.get(f"{LEDGER}/999999")).status_code == 404

    @pytest.mark.asyncio
    async def test_the_drill_down_is_admin_only(self, learner_client, make_order):
        order = await make_order()

        assert (await learner_client.get(f"{LEDGER}/{order.id}")).status_code == 403


class TestAccess:
    @pytest.mark.asyncio
    async def test_the_ledger_is_admin_only(self, learner_client):
        assert (await learner_client.get(LEDGER)).status_code == 403
