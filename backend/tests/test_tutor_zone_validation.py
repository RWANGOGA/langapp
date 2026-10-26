"""The tutor's own zone, and the zone stamped on each availability window, are
the raw material of two things that matter: how lesson times are shown back to
the tutor, and - from the matching engine onward - whether their stated hours
overlap a learner's day.

So the rule already guarding a learner's account applies here too: only real
IANA identifiers are stored, on the tutor and on every window. An invented zone
is refused rather than quietly corrected, and a refused write leaves the
previously saved schedule exactly as it was."""
import pytest
import pytest_asyncio
from sqlalchemy import select

from tests.sqlite_fixtures import (  # noqa: F811, F401
    db_session, tutor_user, learner_user, client,
)
from app.models.user import TutorProfile, TutorAvailability


class TestTutorZoneValidation:
    @pytest_asyncio.fixture
    async def profile(self, db_session, tutor_user):  # noqa: F811
        p = TutorProfile(
            user_id=tutor_user.id, headline="Celtic TEFL pro", country="Ireland",
        )
        db_session.add(p)
        await db_session.commit()
        await db_session.refresh(p)
        await db_session.refresh(tutor_user, ["tutor_profile"])
        return p

    @pytest.mark.asyncio
    async def test_an_invented_zone_on_the_tutor_is_refused(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        r = await client.patch("/api/v1/tutor/profile", json={
            "timezone": "Africa/Mars",
        })
        assert r.status_code == 400, r.text

        await db_session.refresh(tutor_user)
        assert tutor_user.timezone is None, "a refused zone must not be stored"

    @pytest.mark.asyncio
    async def test_an_invented_zone_on_a_window_is_refused(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        """A window carrying a zone the tz database does not know cannot be
        converted to UTC, so the matching engine would have to guess at it."""
        r = await client.patch("/api/v1/tutor/profile", json={
            "availability": [
                {"dayOfWeek": 1, "startTime": "09:00", "endTime": "11:00",
                 "timezone": "Mars/Olympus_Mons"},
            ],
        })
        assert r.status_code == 400, r.text

        found = await db_session.execute(
            select(TutorAvailability).where(
                TutorAvailability.profile_id == profile.id
            )
        )
        assert found.scalars().all() == [], "a refused week must not leave windows behind"

    @pytest.mark.asyncio
    async def test_a_refused_write_leaves_the_saved_week_intact(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        """The replacement is all-or-nothing: failing on a bad zone cannot have
        already deleted the windows the tutor was actually teaching from."""
        await client.patch("/api/v1/tutor/profile", json={
            "availability": [
                {"dayOfWeek": 2, "startTime": "10:00", "endTime": "12:00",
                 "timezone": "Europe/Dublin"},
            ],
        })

        r = await client.patch("/api/v1/tutor/profile", json={
            "availability": [
                {"dayOfWeek": 3, "startTime": "10:00", "endTime": "12:00",
                 "timezone": "Not/AZone"},
            ],
        })
        assert r.status_code == 400, r.text

        again = await client.get("/api/v1/tutor/profile")
        days = [a["dayOfWeek"] for a in again.json()["availability"]]
        assert days == [2]

    @pytest.mark.asyncio
    async def test_a_real_zone_on_a_window_is_stored(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        r = await client.patch("/api/v1/tutor/profile", json={
            "timezone": "Asia/Dubai",
            "availability": [
                {"dayOfWeek": 0, "startTime": "18:00", "endTime": "20:00",
                 "timezone": "Asia/Dubai"},
            ],
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["timezone"] == "Asia/Dubai"
        assert body["availability"][0]["timezone"] == "Asia/Dubai"
