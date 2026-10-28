"""Tests for in-app lesson calls (LiveKit).

Two surfaces are covered here, both against the isolated in-memory SQLite
harness so no external LiveKit project or network call is touched:

- POST /tutor/sessions/{id}/room - a tutor opens an in-app room. Ownership and
  status guards mirror the existing meeting-link endpoint; enabling notifies the
  assigned learner with a room_ready link that carries the class id, and is
  idempotent (a second enable reuses the room and does not re-notify).

- GET /sessions/{id}/call - both assigned participants exchange the class for a
  short-lived, room-scoped token. A stranger gets a 404 (we never leak that a
  class id exists), a room-less or dead-status class gets a 409, and a server
  without LIVEKIT_* configured gets a 503 so the UI can fall back to a link.

Token minting is pure HS256 signing, so the success path is asserted by
decoding the returned JWT and checking its grant room + identity - no network.
"""
import jwt
import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.config import settings
from app.models.notification import Notification
from app.models.user import Class, ClassStatus, User

# Shared SQLite harness (fixtures are picked up by name from this module).
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    other_tutor_user,
    klass,
    client,
    learner_client,
    other_client,
    make_class,
)

ROOM_BASE = "/api/v1/tutor/sessions"
CALL_BASE = "/api/v1/sessions"


@pytest.fixture
def livekit_on(monkeypatch):
    """Point the settings at a (fake) LiveKit project so tokens can be minted.

    The values need only be non-empty: minting signs locally and never dials
    the network, so a dummy key/secret produces a structurally valid JWT.
    """
    monkeypatch.setattr(settings, "LIVEKIT_URL", "wss://test.livekit.cloud")
    monkeypatch.setattr(settings, "LIVEKIT_API_KEY", "apikey")
    monkeypatch.setattr(settings, "LIVEKIT_API_SECRET", "secretsecretsecretsecretsecretsecret")


@pytest_asyncio.fixture
async def room_class(db_session, klass):
    """A scheduled class that already has an in-app room attached."""
    klass.room_name = f"class-{klass.id}"
    await db_session.commit()
    await db_session.refresh(klass)
    return klass


class TestEnableRoom:
    @pytest.mark.asyncio
    async def test_owner_sets_deterministic_room(self, client, db_session, klass):
        response = await client.post(f"{ROOM_BASE}/{klass.id}/room")
        assert response.status_code == 200
        assert response.json()["room_name"] == f"class-{klass.id}"
        await db_session.refresh(klass)
        assert klass.room_name == f"class-{klass.id}"

    @pytest.mark.asyncio
    async def test_enabling_notifies_learner_with_call_link(
        self, client, db_session, klass, learner_user
    ):
        await client.post(f"{ROOM_BASE}/{klass.id}/room")
        result = await db_session.execute(
            select(Notification).where(
                Notification.recipient_id == learner_user.id,
                Notification.notification_type == "room_ready",
            )
        )
        notes = result.scalars().all()
        assert len(notes) == 1
        # The deep link carries the class id so it routes straight to the call.
        assert notes[0].link == f"/class/{klass.id}/call"

    @pytest.mark.asyncio
    async def test_enable_is_idempotent_and_does_not_renotify(
        self, client, db_session, klass, learner_user
    ):
        first = await client.post(f"{ROOM_BASE}/{klass.id}/room")
        second = await client.post(f"{ROOM_BASE}/{klass.id}/room")
        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["room_name"] == second.json()["room_name"]

        result = await db_session.execute(
            select(Notification).where(
                Notification.recipient_id == learner_user.id,
                Notification.notification_type == "room_ready",
            )
        )
        assert len(result.scalars().all()) == 1

    @pytest.mark.asyncio
    async def test_other_tutor_gets_404(self, other_client, klass):
        response = await other_client.post(f"{ROOM_BASE}/{klass.id}/room")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cancelled_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.CANCELLED
        await db_session.commit()
        response = await client.post(f"{ROOM_BASE}/{klass.id}/room")
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_completed_class_conflicts(self, client, db_session, klass):
        klass.status = ClassStatus.COMPLETED
        await db_session.commit()
        response = await client.post(f"{ROOM_BASE}/{klass.id}/room")
        assert response.status_code == 409


class TestJoinCall:
    @pytest.mark.asyncio
    async def test_tutor_receives_scoped_token(self, client, room_class, livekit_on):
        response = await client.get(f"{CALL_BASE}/{room_class.id}/call")
        assert response.status_code == 200
        body = response.json()
        assert body["url"] == "wss://test.livekit.cloud"
        assert body["room"] == f"class-{room_class.id}"
        assert body["identity"] == str(room_class.tutor_id)

        claims = jwt.decode(
            body["token"], options={"verify_signature": False}
        )
        assert claims["sub"] == str(room_class.tutor_id)
        assert claims["video"]["room"] == f"class-{room_class.id}"
        assert claims["video"]["roomJoin"] is True

    @pytest.mark.asyncio
    async def test_learner_receives_scoped_token(
        self, learner_client, room_class, tutor_user, livekit_on
    ):
        response = await learner_client.get(f"{CALL_BASE}/{room_class.id}/call")
        assert response.status_code == 200
        body = response.json()
        assert body["identity"] == str(room_class.learner_id)
        claims = jwt.decode(body["token"], options={"verify_signature": False})
        assert claims["sub"] == str(room_class.learner_id)
        assert claims["video"]["room"] == f"class-{room_class.id}"

    @pytest.mark.asyncio
    async def test_stranger_gets_404(self, other_client, room_class, livekit_on):
        response = await other_client.get(f"{CALL_BASE}/{room_class.id}/call")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_no_room_conflicts(self, client, klass, livekit_on):
        # klass has no room_name set - external-link lesson, nothing to join.
        response = await client.get(f"{CALL_BASE}/{klass.id}/call")
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_dead_status_conflicts(self, client, db_session, room_class, livekit_on):
        room_class.status = ClassStatus.COMPLETED
        await db_session.commit()
        response = await client.get(f"{CALL_BASE}/{room_class.id}/call")
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_disabled_returns_503(self, client, room_class, monkeypatch):
        monkeypatch.setattr(settings, "LIVEKIT_URL", None)
        monkeypatch.setattr(settings, "LIVEKIT_API_KEY", None)
        monkeypatch.setattr(settings, "LIVEKIT_API_SECRET", None)
        response = await client.get(f"{CALL_BASE}/{room_class.id}/call")
        assert response.status_code == 503
