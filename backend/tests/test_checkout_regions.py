"""Checkout must state one price in one currency and offer only the rails that
work where the student is.

Today the page shows ¥ to everyone regardless of region and lists every wallet
(PayPay, ZaloPay, MoMo, Mobile Money) no matter where the buyer stands. A
regional wallet offered outside its region is decoration, and a checkout that
cannot say which currency it is charging is not international.

This map is the single definition the checkout page, the order and (one day)
the payment provider all read from, so they cannot disagree.
"""
import itertools

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.package import Package, PaymentMethod
from app.models.user import ProficiencyLevel, User, UserRole
from tests.sqlite_fixtures import db_session  # noqa: F401  (fixture registration)

_EMAIL = itertools.count(1)


def _public_client(db: AsyncSession) -> AsyncClient:
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture
def public_client(db_session):
    ac = _public_client(db_session)
    yield ac
    app.dependency_overrides.clear()


async def _seed_student_and_package(db: AsyncSession):
    student = User(
        email=f"buyer.{next(_EMAIL)}@example.com",
        hashed_password="x",
        full_name="Buyer",
        role=UserRole.STUDENT,
        proficiency_level=ProficiencyLevel.B1,
        is_active=True,
    )
    pkg = Package(
        id="starter", name="Starter", months=1,
        price_jpy=8000, price_vnd=1400000, price_usd=55, features=[],
    )
    db.add_all([student, pkg])
    await db.commit()
    await db.refresh(student)
    return student


def _student_client(db: AsyncSession, student: User) -> AsyncClient:
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = lambda: student
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


class TestRegionMap:
    def test_each_region_carries_exactly_one_currency_and_a_way_to_pay(self):
        from app.services import checkout_regions

        for region in checkout_regions.REGIONS:
            assert region.currency in {"JPY", "VND", "USD"}, region
            assert region.methods, f"{region.code} must offer at least one method"

    def test_every_payment_method_serves_some_region(self):
        # A method in the enum that no region offers is dead weight the page
        # could never legitimately show; it belongs in the map or nowhere.
        from app.services import checkout_regions

        offered = {m for r in checkout_regions.REGIONS for m in r.methods}
        assert offered == set(PaymentMethod), offered ^ set(PaymentMethod)

    def test_card_and_paypal_are_universal(self):
        from app.services import checkout_regions

        for region in checkout_regions.REGIONS:
            assert checkout_regions.serves(region.code, PaymentMethod.CARD)
            assert checkout_regions.serves(region.code, PaymentMethod.PAYPAL)

    def test_a_regional_wallet_only_serves_its_own_region(self):
        from app.services import checkout_regions

        assert checkout_regions.serves("vn", PaymentMethod.ZALOPAY)
        assert not checkout_regions.serves("jp", PaymentMethod.ZALOPAY)
        assert checkout_regions.serves("jp", PaymentMethod.PAYPAY)
        assert not checkout_regions.serves("vn", PaymentMethod.PAYPAY)
        assert checkout_regions.serves("intl", PaymentMethod.MOBILE_MONEY)
        assert not checkout_regions.serves("jp", PaymentMethod.MOBILE_MONEY)

    def test_amount_follows_the_regions_currency(self):
        from app.services import checkout_regions

        pkg = Package(id="starter", name="Starter", months=1,
                      price_jpy=8000, price_vnd=1400000, price_usd=55, features=[])
        assert checkout_regions.amount_in(checkout_regions.BY_CODE["jp"], pkg) == 8000
        assert checkout_regions.amount_in(checkout_regions.BY_CODE["vn"], pkg) == 1400000
        assert checkout_regions.amount_in(checkout_regions.BY_CODE["intl"], pkg) == 55

    def test_an_unknown_region_serves_nothing(self):
        from app.services import checkout_regions

        assert checkout_regions.BY_CODE.get("xx") is None
        assert checkout_regions.serves("xx", PaymentMethod.CARD) is False


class TestCheckoutOptionsApi:
    @pytest.mark.asyncio
    async def test_regions_are_readable_without_signing_in(self, public_client):
        res = await public_client.get("/api/v1/checkout/regions")
        assert res.status_code == 200, res.text
        body = res.json()
        assert {r["code"] for r in body} == {"jp", "vn", "intl"}
        for r in body:
            assert r["currency"] in {"JPY", "VND", "USD"}
            assert r["methods"], r
            # Methods travel as their wire values, never Python enum names.
            assert set(r["methods"]) <= {m.value for m in PaymentMethod}, r

    @pytest.mark.asyncio
    async def test_a_method_that_serves_the_region_is_accepted(self, db_session):
        student = await _seed_student_and_package(db_session)
        async with _student_client(db_session, student) as ac:
            res = await ac.post("/api/v1/checkout", json={
                "package_id": "starter", "region": "vn",
                "payment_method": "zalopay", "subject": "General English",
                "session_type": "conversation", "duration_minutes": 60,
            })
        assert res.status_code == 201, res.text

    @pytest.mark.asyncio
    async def test_a_method_from_another_region_is_rejected(self, db_session):
        # PayPay is a Japanese rail; a Vietnam buyer cannot pay with it.
        student = await _seed_student_and_package(db_session)
        async with _student_client(db_session, student) as ac:
            res = await ac.post("/api/v1/checkout", json={
                "package_id": "starter", "region": "vn",
                "payment_method": "paypay", "subject": "General English",
                "session_type": "conversation", "duration_minutes": 60,
            })
        assert res.status_code == 422, res.text
        assert "paypay" in res.text.lower() or "region" in res.text.lower()

    @pytest.mark.asyncio
    async def test_an_unknown_region_is_rejected(self, db_session):
        student = await _seed_student_and_package(db_session)
        async with _student_client(db_session, student) as ac:
            res = await ac.post("/api/v1/checkout", json={
                "package_id": "starter", "region": "mars",
                "payment_method": "card", "subject": "General English",
                "session_type": "conversation", "duration_minutes": 60,
            })
        assert res.status_code == 422, res.text
