"""
Step 6 - tutor portal pages backend (red-first).

The tutor nav promises four pages that 404 today: Learners, Schedule,
Lesson Notes, Settings. These endpoints feed them from real data:

  GET  /tutor/learners   every learner with a class of mine, plus any
                         assigned to me: name, level, sessions completed
                         / upcoming, last and next session instants
  GET  /tutor/schedule   future scheduled sessions (window in days)
  GET  /tutor/notes      completed sessions newest-first, with the
                         feedback notes tutors wrote at completion
  GET/PATCH /tutor/profile   view + edit whitelisted profile fields and
                         weekly availability. Rating, approval and money
                         fields are staff-owned and never writable here.

Times follow the house convention: naive-UTC in the DB, explicit
`+00:00` ISO strings at the API boundary.
"""
import pytest
import pytest_asyncio

from tests.sqlite_fixtures import (  # noqa: F401
    db_session, tutor_user, learner_user, other_tutor_user, klass, client, make_class, make_client,
)
from app.models.user import User, UserRole, TutorProfile, ClassStatus, ProficiencyLevel


def _utc_iso_has_offset(value: str):
    return value.endswith("+00:00")


class TestTutorLearners:
    @pytest.mark.asyncio
    async def test_lists_my_learners_with_counts(
        self, db_session, tutor_user, learner_user, other_tutor_user, client  # noqa: F811
    ):
        second = User(
            email="second.learner@example.com", hashed_password="x",
            full_name="Second Learner", role=UserRole.STUDENT,
            proficiency_level=ProficiencyLevel.A2, is_active=True, tutor_id=tutor_user.id,
        )
        db_session.add(second)
        await db_session.commit()
        done = make_class(tutor_user.id, learner_user.id, hours_from_now=-30)
        done.status = ClassStatus.COMPLETED
        future = make_class(tutor_user.id, learner_user.id, hours_from_now=20)
        others = make_class(other_tutor_user.id, learner_user.id, hours_from_now=5)
        for c in (done, future, others):
            db_session.add(c)
        await db_session.commit()

        r = await client.get("/api/v1/tutor/learners")
        assert r.status_code == 200, r.text
        by_name = {x["name"]: x for x in r.json()["learners"]}

        # Learner with classes appears; a bystander tutor's class is not counted.
        first = by_name["Test Learner"]
        assert first["completed"] == 1
        assert first["upcoming"] == 1
        assert first["level"] == "B1"
        assert _utc_iso_has_offset(first["lastCompletedAt"])
        assert _utc_iso_has_offset(first["nextSessionAt"])

        # Assigned-but-never-taught learner still appears with zero counts.
        snd = by_name["Second Learner"]
        assert snd["completed"] == 0 and snd["upcoming"] == 0
        assert snd["nextSessionAt"] is None and snd["lastCompletedAt"] is None
        assert snd["level"] == "A2"

    @pytest.mark.asyncio
    async def test_non_tutor_forbidden(self, db_session, learner_user):  # noqa: F811
        async with make_client(db_session, learner_user) as c:
            r = await c.get("/api/v1/tutor/learners")
        assert r.status_code == 403


class TestTutorSchedule:
    @pytest.mark.asyncio
    async def test_future_scheduled_only_sorted_asc(
        self, db_session, tutor_user, learner_user, other_tutor_user, client  # noqa: F811
    ):
        far = make_class(tutor_user.id, learner_user.id, hours_from_now=96, class_id=None)
        near = make_class(tutor_user.id, learner_user.id, hours_from_now=24)
        past = make_class(tutor_user.id, learner_user.id, hours_from_now=-5)
        cancelled = make_class(tutor_user.id, learner_user.id, hours_from_now=12)
        cancelled.status = ClassStatus.CANCELLED
        foreign = make_class(other_tutor_user.id, learner_user.id, hours_from_now=48)
        for c in (far, near, past, cancelled, foreign):
            db_session.add(c)
        await db_session.commit()

        r = await client.get("/api/v1/tutor/schedule")
        assert r.status_code == 200, r.text
        items = r.json()["sessions"]
        starts = [x["startsAt"] for x in items]
        assert len(items) == 2, items  # near + far only
        assert starts == sorted(starts)
        assert all(_utc_iso_has_offset(s) for s in starts)
        assert items[0]["learner"] == "Test Learner"
        assert items[0]["durationMinutes"] == 60

    @pytest.mark.asyncio
    async def test_window_is_capped(
        self, db_session, tutor_user, learner_user, client  # noqa: F811
    ):
        soon = make_class(tutor_user.id, learner_user.id, hours_from_now=2)
        late = make_class(tutor_user.id, learner_user.id, hours_from_now=24 * 120)
        db_session.add(soon); db_session.add(late)
        await db_session.commit()
        r = await client.get("/api/v1/tutor/schedule", params={"days": 30})
        assert r.status_code == 200, r.text
        items = r.json()["sessions"]
        # Only `soon` survives the window; and it must leave as the exact
        # UTC instant we stored (naive value + explicit +00:00).
        assert [x["startsAt"] for x in items] == [soon.scheduled_at.isoformat() + "+00:00"]


class TestTutorNotes:
    @pytest.mark.asyncio
    async def test_completed_newest_first_with_notes(
        self, db_session, tutor_user, learner_user, client  # noqa: F811
    ):
        older = make_class(tutor_user.id, learner_user.id, hours_from_now=-72)
        older.status = ClassStatus.COMPLETED
        older.notes = "Great progress on past tense."
        newer = make_class(tutor_user.id, learner_user.id, hours_from_now=-24)
        newer.status = ClassStatus.COMPLETED
        newer.notes = "Fluency improving fast."
        still_scheduled = make_class(tutor_user.id, learner_user.id, hours_from_now=10)
        db_session.add(older); db_session.add(newer); db_session.add(still_scheduled)
        await db_session.commit()

        r = await client.get("/api/v1/tutor/notes")
        assert r.status_code == 200, r.text
        notes = r.json()["notes"]
        assert len(notes) == 2
        assert notes[0]["notes"] == "Fluency improving fast."   # newest first
        assert notes[1]["notes"] == "Great progress on past tense."
        assert notes[0]["learner"] == "Test Learner"
        assert _utc_iso_has_offset(notes[0]["startsAt"])

    @pytest.mark.asyncio
    async def test_notes_only_mine(
        self, db_session, other_tutor_user, learner_user, client  # noqa: F811
    ):
        foreign = make_class(other_tutor_user.id, learner_user.id, hours_from_now=-3)
        foreign.status = ClassStatus.COMPLETED
        foreign.notes = "Not yours."
        db_session.add(foreign)
        await db_session.commit()
        r = await client.get("/api/v1/tutor/notes")
        assert r.json()["notes"] == []


class TestTutorProfileSettings:
    @pytest_asyncio.fixture
    async def profile(self, db_session, tutor_user):  # noqa: F811
        p = TutorProfile(
            user_id=tutor_user.id, headline="Celtic TEFL pro", country="Ireland",
            bio="Six years of business English.", years_experience=6, rating=4.8,
            reviews_count=32, is_approved=True,
        )
        db_session.add(p)
        await db_session.commit()
        await db_session.refresh(p)
        await db_session.refresh(tutor_user, ["tutor_profile"])
        return p

    @pytest.mark.asyncio
    async def test_get_profile(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        r = await client.get("/api/v1/tutor/profile")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["headline"] == "Celtic TEFL pro"
        assert body["email"] == tutor_user.email
        assert body["rating"] == 4.8

    @pytest.mark.asyncio
    async def test_missing_profile_is_404(self, db_session, client):  # noqa: F811
        r = await client.get("/api/v1/tutor/profile")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_patch_updates_whitelisted_fields(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        r = await client.patch("/api/v1/tutor/profile", json={
            "headline": "Business English specialist",
            "bio": "Now twelve years.",
            "country": "Kenya",
            "timezone": "Africa/Nairobi",
            "availability": [
                {"dayOfWeek": 1, "startTime": "09:00", "endTime": "11:00", "timezone": "Africa/Nairobi"},
                {"dayOfWeek": 3, "startTime": "15:00", "endTime": "17:00", "timezone": "Africa/Nairobi"},
            ],
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["headline"] == "Business English specialist"
        assert body["bio"] == "Now twelve years."
        assert body["country"] == "Kenya"
        assert body["timezone"] == "Africa/Nairobi"
        assert len(body["availability"]) == 2
        await db_session.refresh(tutor_user)
        assert tutor_user.timezone == "Africa/Nairobi"

    @pytest.mark.asyncio
    async def test_patch_cannot_touch_staff_owned_fields(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        """Rating, review counts and approval are staff attestations."""
        r = await client.patch("/api/v1/tutor/profile", json={
            "rating": 5.0,
            "reviews_count": 9999,
            "is_approved": False,
            "years_experience": 99,
        })
        assert r.status_code == 200, r.text
        await db_session.refresh(profile)
        assert profile.rating == 4.8
        assert profile.reviews_count == 32
        assert profile.is_approved is True
        assert profile.years_experience == 6

    @pytest.mark.asyncio
    async def test_availability_is_validated(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        r = await client.patch("/api/v1/tutor/profile", json={
            "availability": [{"dayOfWeek": 7, "startTime": "09:00", "endTime": "11:00", "timezone": "UTC"}],
        })
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_patch_replaces_availability_whole(
        self, db_session, tutor_user, client, profile  # noqa: F811
    ):
        await client.patch("/api/v1/tutor/profile", json={
            "availability": [{"dayOfWeek": 2, "startTime": "10:00", "endTime": "12:00", "timezone": "UTC"}],
        })
        r = await client.patch("/api/v1/tutor/profile", json={
            "availability": [
                {"dayOfWeek": 4, "startTime": "08:00", "endTime": "09:00", "timezone": "UTC"},
                {"dayOfWeek": 5, "startTime": "08:00", "endTime": "09:00", "timezone": "UTC"},
            ],
        })
        assert r.status_code == 200
        days = sorted(a["dayOfWeek"] for a in r.json()["availability"])
        assert days == [4, 5]  # previous single window fully replaced
