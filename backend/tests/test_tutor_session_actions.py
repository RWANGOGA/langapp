"""Tests for tutor session actions: feedback, meeting-link, complete.

These use an isolated in-memory SQLite database (never the real Neon DB)
and a dependency-injected tutor user, so the tests are deterministic and
touch no external state.

Business rules under test:
- Only the tutor who owns the class may act on it (404 otherwise).
- Cancelled classes accept no actions (409).
- Completed classes accept only feedback (lesson notes are written after class).
- Feedback notifies the learner with a lesson_feedback notification.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import select

from app.models.user import User, UserRole, Class, ClassStatus, ProficiencyLevel
from app.models.notification import Notification

# Shared SQLite harness (fixtures are picked up by name from this module).
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    other_tutor_user,
    klass,
    client,
    other_client,
    make_client,
)

BASE = "/api/v1/tutor/sessions"


class TestMeetingLink:
    @pytest.mark.asyncio
    async def test_owner_sets_zoom_url(self, client, db_session, klass):
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "zoom", "url": "https://zoom.us/j/123456789"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["zoom_url"] == "https://zoom.us/j/123456789"
        assert body["meet_url"] is None

    @pytest.mark.asyncio
    async def test_owner_sets_meet_url(self, client, db_session, klass):
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "google_meet", "url": "https://meet.google.com/abc-defg-hij"},
        )
        assert response.status_code == 200
        assert response.json()["meet_url"] == "https://meet.google.com/abc-defg-hij"

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "zoom", "url": "https://zoom.us/j/1"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_provider_rejected(self, client, klass):
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "ms_teams", "url": "https://teams.microsoft.com/l/1"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_non_url_rejected(self, client, klass):
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "zoom", "url": "not a url"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_cancelled_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.CANCELLED
        await db_session.commit()
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "zoom", "url": "https://zoom.us/j/1"},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_completed_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.COMPLETED
        await db_session.commit()
        response = await client.post(
            f"{BASE}/{klass.id}/meeting-link",
            json={"provider": "zoom", "url": "https://zoom.us/j/1"},
        )
        assert response.status_code == 409


class TestCompleteSession:
    @pytest.mark.asyncio
    async def test_owner_completes_scheduled_class(self, client, db_session, klass):
        response = await client.post(f"{BASE}/{klass.id}/complete")
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_completing_twice_conflicts(self, client, db_session, klass):
        await client.post(f"{BASE}/{klass.id}/complete")
        response = await client.post(f"{BASE}/{klass.id}/complete")
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(f"{BASE}/{klass.id}/complete")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unknown_class_gets_404(self, client):
        response = await client.post(f"{BASE}/999999/complete")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_completing_cancelled_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.CANCELLED
        await db_session.commit()
        response = await client.post(f"{BASE}/{klass.id}/complete")
        assert response.status_code == 409


class TestFeedback:
    @pytest.mark.asyncio
    async def test_owner_saves_feedback_and_notifies_learner(
        self, client, db_session, klass, learner_user
    ):
        response = await client.post(
            f"{BASE}/{klass.id}/feedback",
            json={"topic": "Unit 7 - Conversation", "feedback": "Great fluency today. Review phrasal verbs."},
        )
        assert response.status_code == 200
        # Notes persisted on the class
        await db_session.refresh(klass)
        assert "phrasal verbs" in klass.notes

        # Learner received exactly one lesson_feedback notification
        result = await db_session.execute(
            select(Notification).where(
                Notification.recipient_id == learner_user.id,
                Notification.notification_type == "lesson_feedback",
            )
        )
        notes = result.scalars().all()
        assert len(notes) == 1
        assert "Unit 7" in notes[0].title

    @pytest.mark.asyncio
    async def test_empty_feedback_rejected(self, client, klass):
        response = await client.post(
            f"{BASE}/{klass.id}/feedback",
            json={"feedback": ""},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(
            f"{BASE}/{klass.id}/feedback",
            json={"feedback": "well done"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_feedback_allowed_after_completion(self, client, db_session, klass):
        await client.post(f"{BASE}/{klass.id}/complete")
        response = await client.post(
            f"{BASE}/{klass.id}/feedback",
            json={"feedback": "Solid progress on listening."},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_feedback_on_cancelled_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.CANCELLED
        await db_session.commit()
        response = await client.post(
            f"{BASE}/{klass.id}/feedback",
            json={"feedback": "hello"},
        )
        assert response.status_code == 409
