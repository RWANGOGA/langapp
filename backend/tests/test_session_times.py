"""Tests for timezone correctness of session times across the API.

Conventions under test:
- DB stores naive UTC (documented convention, works on Postgres + SQLite).
- Every API surface that shows a class time must expose an explicit UTC
  instant (`startsAt` / `starts_at` ending in "+00:00") so browsers can
  render the learner's/tutor's local time instead of guessing.
- Server-side "now" must be UTC (the old code used local `datetime.now()`
  and `date.today()`, which breaks "today's sessions" for non-UTC servers).
"""
import pytest
from datetime import datetime, timezone, timedelta

from app.models.user import TutorProfile
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    klass,
    client,
    learner_client,
    make_class,
)

UTC_SUFFIX = "+00:00"


def _assert_utc_instant(value):
    assert isinstance(value, str) and value.endswith(UTC_SUFFIX), (
        f"expected explicit UTC ISO instant, got {value!r}"
    )
    parsed = datetime.fromisoformat(value)
    assert parsed.utcoffset() == timedelta(0)


class TestLearnerDashboardTimes:
    @pytest.mark.asyncio
    async def test_class_list_exposes_utc_instant(self, learner_client, klass):
        response = await learner_client.get("/api/v1/learner/dashboard")
        assert response.status_code == 200
        body = response.json()
        assert len(body["classes"]) == 1
        assert body["classes"][0]["id"] == klass.id, ("client needs the class id to cancel")
        _assert_utc_instant(body["classes"][0]["startsAt"])
        # The naive-UTC scheduled_at must map to the exact same instant.
        expected = klass.scheduled_at.replace(tzinfo=timezone.utc)
        assert datetime.fromisoformat(body["classes"][0]["startsAt"]) == expected

    @pytest.mark.asyncio
    async def test_next_class_exposes_utc_instant_and_countdown(self, learner_client, klass):
        response = await learner_client.get("/api/v1/learner/dashboard")
        body = response.json()
        nxt = body["nextClass"]
        assert nxt is not None
        _assert_utc_instant(nxt["startsAt"])
        # klass starts in ~2h; countdown must reflect UTC-now, not server-local-now.
        assert 65 * 60 <= nxt["secondsLeft"] <= 125 * 60


class TestTutorDashboardTimes:
    @pytest.mark.asyncio
    async def test_sessions_expose_utc_instant_and_status(
        self, db_session, tutor_user, learner_user
    ):
        db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
        cls = make_class(tutor_user.id, learner_user.id, hours_from_now=1.0)
        db_session.add(cls)
        await db_session.commit()
        # Mirror the real get_current_user, which selectinloads tutor_profile.
        await db_session.refresh(tutor_user, ["tutor_profile"])

        from tests.sqlite_fixtures import make_client

        async with make_client(db_session, tutor_user) as ac:
            response = await ac.get("/api/v1/tutor/dashboard")
        assert response.status_code == 200
        body = response.json()

        utc_today = datetime.now(timezone.utc).date().isoformat()
        assert body["today"] == utc_today, "today must be the UTC date, not server-local"

        assert len(body["sessions"]) == 1
        session = body["sessions"][0]
        _assert_utc_instant(session["startsAt"])
        assert session["status"] == "scheduled"
        _assert_utc_instant(body["next"]["startsAt"])
        # 1h from UTC now: local-clock bug would skew this by hours.
        assert 50 * 60 <= body["next"]["secondsLeft"] <= 70 * 60


class TestSessionActionResponses:
    @pytest.mark.asyncio
    async def test_action_response_updated_at_is_explicit_utc(self, client, klass):
        response = await client.post(f"/api/v1/tutor/sessions/{klass.id}/complete")
        assert response.status_code == 200
        body = response.json()
        _assert_utc_instant(body["updated_at"])
        _assert_utc_instant(body["starts_at"])
