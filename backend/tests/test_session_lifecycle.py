"""Tests for the session lifecycle: cancellation and no-show rules.

State machine under test (Class.status):
    scheduled -> completed        (Step 1)
    scheduled -> cancelled        (tutor or learner, before start)
    scheduled -> no_show          (tutor, only after the start time passed)

Business rules:
- Only the owning tutor may cancel/no-show their session (404 otherwise).
- Terminal statuses (completed/cancelled/no_show) accept no further transitions.
- A learner may cancel their own class; inside the 24h window a reason is
  required (global-platform policy), and never after the class started.
- Every cancellation notifies the *other* side with a class_cancelled alert.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import select

from app.models.user import User, Class, ClassStatus
from app.models.notification import Notification
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    other_tutor_user,
    klass,
    client,
    learner_client,
    other_client,
    make_client,
    make_class,
)

TUTOR_BASE = "/api/v1/tutor/sessions"
LEARNER_BASE = "/api/v1/learner/sessions"


async def _notifications(db, recipient_id, ntype):
    result = await db.execute(
        select(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.notification_type == ntype,
        )
    )
    return result.scalars().all()


class TestTutorCancel:
    @pytest.mark.asyncio
    async def test_owner_cancels_scheduled_class_and_notifies_learner(
        self, client, db_session, klass, learner_user, tutor_user
    ):
        response = await client.post(
            f"{TUTOR_BASE}/{klass.id}/cancel",
            json={"reason": "Tutor is traveling"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

        await db_session.refresh(klass)
        assert klass.status == ClassStatus.CANCELLED

        notes = await _notifications(db_session, learner_user.id, "class_cancelled")
        assert len(notes) == 1
        assert "traveling" in notes[0].message

    @pytest.mark.asyncio
    async def test_cancel_without_reason_is_allowed(self, client, klass):
        response = await client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_cancelling_twice_conflicts(self, client, klass):
        await client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        response = await client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_cancelling_completed_class_conflicts(self, client, klass):
        await client.post(f"{TUTOR_BASE}/{klass.id}/complete")
        response = await client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        assert response.status_code == 404


class TestTutorNoShow:
    @pytest.mark.asyncio
    async def test_marks_past_scheduled_class_as_no_show(
        self, db_session, tutor_user, learner_user
    ):
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=-1.0)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, tutor_user) as ac:
            response = await ac.post(f"{TUTOR_BASE}/{cls.id}/no-show", json={})
        assert response.status_code == 200
        assert response.json()["status"] == "no_show"
        notes = await _notifications(db_session, learner_user.id, "class_no_show")
        assert len(notes) == 1

    @pytest.mark.asyncio
    async def test_no_show_on_future_class_conflicts(self, client, klass):
        response = await client.post(f"{TUTOR_BASE}/{klass.id}/no-show", json={})
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_no_show_on_cancelled_class_conflicts(self, client, klass):
        await client.post(f"{TUTOR_BASE}/{klass.id}/cancel", json={})
        response = await client.post(f"{TUTOR_BASE}/{klass.id}/no-show", json={})
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(f"{TUTOR_BASE}/{klass.id}/no-show", json={})
        assert response.status_code == 404


class TestLearnerCancel:
    @pytest.mark.asyncio
    async def test_learner_cancels_well_in_advance(
        self, db_session, tutor_user, learner_user
    ):
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=48.0)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, learner_user) as ac:
            response = await ac.post(f"{LEARNER_BASE}/{cls.id}/cancel", json={})
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

        notes = await _notifications(db_session, tutor_user.id, "class_cancelled")
        assert len(notes) == 1
        assert "Test Learner" in notes[0].message or "cancelled" in notes[0].message.lower()

    @pytest.mark.asyncio
    async def test_learner_cancel_inside_24h_requires_reason(
        self, db_session, tutor_user, learner_user
    ):
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=3.0)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, learner_user) as ac:
            response = await ac.post(f"{LEARNER_BASE}/{cls.id}/cancel", json={})
        assert response.status_code == 409
        assert "reason" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_learner_cancel_inside_24h_with_reason_ok(
        self, db_session, tutor_user, learner_user
    ):
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=3.0)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, learner_user) as ac:
            response = await ac.post(
                f"{LEARNER_BASE}/{cls.id}/cancel",
                json={"reason": "Feeling unwell"},
            )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_learner_cannot_cancel_started_class(
        self, db_session, tutor_user, learner_user
    ):
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=-0.5)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, learner_user) as ac:
            response = await ac.post(
                f"{LEARNER_BASE}/{cls.id}/cancel",
                json={"reason": "late"},
            )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_learner_cancels_someone_elses_class_gets_404(
        self, db_session, tutor_user, learner_user
    ):
        bystander = User(
            email="learner2@test.com",
            hashed_password="x",
            full_name="Not Involved",
            role="student",
            is_active=True,
        )
        db_session.add(bystander)
        await db_session.commit()
        await db_session.refresh(bystander)
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=48.0)
        db_session.add(cls)
        await db_session.commit()
        await db_session.refresh(cls)
        async with make_client(db_session, bystander) as ac:
            response = await ac.post(f"{LEARNER_BASE}/{cls.id}/cancel", json={})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_learner_cancel_on_completed_conflicts(
        self, db_session, learner_client, klass
    ):
        klass.status = ClassStatus.COMPLETED
        await db_session.commit()
        response = await learner_client.post(f"{LEARNER_BASE}/{klass.id}/cancel", json={})
        assert response.status_code == 409
