"""The admin dashboard is an operations surface, so every figure it prints has
to be a fact from the database rather than a placeholder.

Two of them were not:

- every activity entry was stamped "Just now", which made a class completed
  ten minutes ago and an order paid last week read identically - the log could
  not be used to reason about what happened when;
- one KPI was labelled "System Health" while it actually measured the share of
  learners among all active users, a number no administrator can act on.

Under test: `/admin/dashboard` returns an ISO instant per activity entry and
reports how many learners are still waiting for a tutor.
"""
from datetime import datetime

import pytest
import pytest_asyncio

from app.models.package import Order, OrderStatus, Package
from app.models.user import Class, ClassStatus, TutorProfile, User, UserRole
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    other_tutor_user,
    learner_user,
    make_class,
    make_client,
)


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


def make_package() -> Package:
    return Package(
        id="starter",
        name="Starter",
        months=1,
        price_jpy=15000,
        price_vnd=2500000,
        price_usd=99,
        features=[],
    )


class TestAdminActivityTimestamps:
    @pytest.mark.asyncio
    async def test_activity_entries_carry_the_record_instant(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        completed = make_class(tutor_user.id, learner_user.id, hours_from_now=-26)
        completed.status = ClassStatus.COMPLETED
        completed.updated_at = datetime(2026, 10, 1, 9, 30)
        db_session.add(completed)

        db_session.add(make_package())
        await db_session.commit()

        order = Order(
            package_id="starter",
            user_id=learner_user.id,
            status=OrderStatus.COMPLETED,
            amount_jpy=15000,
            amount_vnd=2500000,
            amount_usd=99,
            created_at=datetime(2026, 10, 2, 8, 0),
        )
        db_session.add(order)
        await db_session.commit()
        await db_session.refresh(order)

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/dashboard")
        assert response.status_code == 200

        entries = {entry["id"]: entry for entry in response.json()["activity"]}
        lesson = entries[f"act_{completed.id}"]
        payment = entries[f"act_order_{order.id}"]

        assert lesson["at"].startswith("2026-10-01T09:30"), (
            "a completed lesson must report when it was completed"
        )
        assert payment["at"].startswith("2026-10-02T08:00"), (
            "a payment must report when the order was created"
        )
        assert "time" not in lesson, "the placeholder wording is gone, not kept beside the instant"


class TestAdminKpis:
    @pytest.mark.asyncio
    async def test_kpi_counts_learners_waiting_for_a_tutor(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        awaiting = User(
            email="awaiting@example.com",
            hashed_password="x",
            full_name="Awaiting Learner",
            role=UserRole.STUDENT,
            is_active=True,
        )
        db_session.add(awaiting)
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/dashboard")
        assert response.status_code == 200

        kpis = {kpi["label"]: kpi["value"] for kpi in response.json()["kpis"]}
        assert kpis["Awaiting a tutor"] == "1", "one learner has no tutor; the dashboard must say so"
        assert "System Health" not in kpis, "the fabricated health figure is replaced, not renamed"


class TestAdminRosterPopulation:
    @pytest.mark.asyncio
    async def test_the_roster_and_the_kpi_count_the_same_learners(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        """Two figures on one screen disagreed: the KPI counted active learners
        without a tutor, the roster listed every learner row it found. A
        deactivated account sat on the roster as someone still waiting."""
        dormant = User(
            email="dormant@example.com",
            hashed_password="x",
            full_name="Dormant Learner",
            role=UserRole.STUDENT,
            is_active=False,
        )
        db_session.add(dormant)
        db_session.add(User(
            email="awaiting@example.com",
            hashed_password="x",
            full_name="Awaiting Learner",
            role=UserRole.STUDENT,
            is_active=True,
        ))
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/dashboard")
        assert response.status_code == 200
        body = response.json()

        roster = {student["email"]: student for student in body["students"]}
        assert "dormant@example.com" not in roster, (
            "a deactivated account is not someone the school is still placing"
        )
        assert roster["learner.test@example.com"]["tutor_name"] == "Test Tutor", (
            "an assigned learner must name the tutor they are assigned to"
        )

        kpis = {kpi["label"]: kpi["value"] for kpi in body["kpis"]}
        awaiting_on_roster = sum(1 for student in body["students"] if not student["tutor_name"])
        assert int(kpis["Awaiting a tutor"]) == awaiting_on_roster == 1, (
            "the headline figure and the roster must add up to the same people"
        )


class TestAdminTutorRoster:
    @pytest.mark.asyncio
    async def test_tutor_country_is_not_dressed_up_as_a_language(
        self, db_session, admin_user, tutor_user, other_tutor_user
    ):
        """The roster labelled a country "language" and invented "English" when
        the profile was empty - two claims the data does not support."""
        db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/dashboard")
        assert response.status_code == 200

        tutors = {tutor["email"]: tutor for tutor in response.json()["tutors"]}
        assert tutors["tutor.test@example.com"]["country"] == "KE", "the country is a country"
        assert "language" not in tutors["tutor.test@example.com"]
        assert tutors["other.tutor@example.com"]["country"] is None, (
            "a tutor without a profile has no country on file, so none is claimed"
        )
