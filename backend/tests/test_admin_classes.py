"""Teaching monitoring was the one part of the admin brief with no backing
endpoint at all: the overview counts scheduled classes, tutors can complete or
cancel them, but nothing in production ever *creates* one and no admin can see
the lesson book as a whole.

Under test: `GET /admin/classes` - the real lesson list with the learners and
tutors named and the scheduled instant carried through as a UTC ISO string,
filterable by status and searchable across learner / tutor / title - and
`POST /admin/classes`, the scheduling step that closes the loop opened by
assignment: a learner with no tutor cannot be scheduled, because the school's
own rule is that an admin places the learner first.
"""
from datetime import datetime, timedelta

import pytest
import pytest_asyncio

from app.models.notification import Notification
from app.models.user import ClassStatus, TutorProfile, User, UserRole
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    make_class,
    make_client,
)


@pytest_asyncio.fixture
async def admin_user(db_session):
    admin = User(
        email="admin.classes@example.com",
        hashed_password="x",
        full_name="Classes Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def assigned_learner(db_session, tutor_user, learner_user):
    """A learner already placed with an approved tutor - the state from which
    an admin is allowed to schedule."""
    db_session.add(TutorProfile(
        user_id=tutor_user.id, country="Kenya", is_approved=True,
    ))
    learner_user.tutor_id = tutor_user.id
    await db_session.commit()
    return learner_user


async def notifications_for(db_session, user_id: int):
    result = await db_session.execute(
        Notification.__table__.select().where(Notification.recipient_id == user_id)
    )
    return [row._mapping for row in result]


class TestAdminClassList:
    @pytest.mark.asyncio
    async def test_the_lesson_book_names_people_and_carries_real_instants(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        upcoming = make_class(tutor_user.id, learner_user.id, hours_from_now=48)
        upcoming.title = "Unit 9 - Listening"
        past = make_class(tutor_user.id, learner_user.id, hours_from_now=-72)
        past.status = ClassStatus.COMPLETED
        past.title = "Unit 8 - Reading"
        db_session.add_all([upcoming, past])
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/classes")
        assert response.status_code == 200

        body = response.json()
        assert body["total"] == 2
        rows = {row["title"]: row for row in body["classes"]}
        assert rows["Unit 9 - Listening"]["learner_name"] == "Test Learner"
        assert rows["Unit 9 - Listening"]["tutor_name"] == "Test Tutor"
        assert rows["Unit 9 - Listening"]["status"] == "scheduled"
        # Newest first: the next lesson leads, the archive follows.
        assert body["classes"][0]["title"] == "Unit 9 - Listening"
        # The instant must be the stored one, not the request time.
        expected = (datetime.utcnow() + timedelta(hours=48)).strftime("%Y-%m-%d")
        assert rows["Unit 9 - Listening"]["scheduled_at"].startswith(expected)
        assert "+00:00" in rows["Unit 9 - Listening"]["scheduled_at"], (
            "instants leave the API as explicit UTC so the browser can localise"
        )

    @pytest.mark.asyncio
    async def test_status_filter_returns_only_that_state(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        db_session.add(make_class(tutor_user.id, learner_user.id, hours_from_now=24))
        late = make_class(tutor_user.id, learner_user.id, hours_from_now=-24)
        late.status = ClassStatus.NO_SHOW
        db_session.add(late)
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.get("/api/v1/admin/classes", params={"status": "no_show"})
        assert response.status_code == 200

        body = response.json()
        assert body["total"] == 1
        assert body["classes"][0]["status"] == "no_show", (
            "the no-show pile is exactly what an admin needs to isolate"
        )

    @pytest.mark.asyncio
    async def test_search_reaches_learners_tutors_and_titles(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        db_session.add(make_class(tutor_user.id, learner_user.id, hours_from_now=24))
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            by_person = await ac.get("/api/v1/admin/classes", params={"search": "Test Learner"})
            by_title = await ac.get("/api/v1/admin/classes", params={"search": "Conversation"})
            by_tutor = await ac.get("/api/v1/admin/classes", params={"search": "Test Tutor"})
            nothing = await ac.get("/api/v1/admin/classes", params={"search": "zzz"})

        assert by_person.json()["total"] == 1
        assert by_title.json()["total"] == 1
        assert by_tutor.json()["total"] == 1
        assert nothing.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_a_learner_cannot_read_the_lesson_book(
        self, db_session, learner_user, tutor_user
    ):
        async with make_client(db_session, learner_user) as ac:
            response = await ac.get("/api/v1/admin/classes")
        assert response.status_code == 403


class TestAdminScheduling:
    @pytest.mark.asyncio
    async def test_an_admin_schedules_the_next_lesson_for_a_placed_learner(
        self, db_session, admin_user, tutor_user, assigned_learner
    ):
        when = datetime.utcnow() + timedelta(days=1)
        async with make_client(db_session, admin_user) as ac:
            response = await ac.post("/api/v1/admin/classes", json={
                "learner_id": assigned_learner.id,
                "title": "Placement conversation",
                "scheduled_at": when.isoformat(),
                "duration_minutes": 45,
            })
        assert response.status_code == 201, (
            "scheduling is the missing step between assigning a tutor and "
            "monitoring teaching"
        )

        row = response.json()
        assert row["tutor_name"] == "Test Tutor", (
            "the class belongs to the learner's assigned tutor"
        )
        assert row["status"] == "scheduled"
        assert row["duration_minutes"] == 45

        learner_notes = await notifications_for(db_session, assigned_learner.id)
        tutor_notes = await notifications_for(db_session, tutor_user.id)
        assert any(n.notification_type == "class_scheduled" for n in learner_notes), (
            "the learner must know when their lesson is"
        )
        assert any(n.notification_type == "class_scheduled" for n in tutor_notes)

    @pytest.mark.asyncio
    async def test_an_unplaced_learner_cannot_be_scheduled(
        self, db_session, admin_user, learner_user
    ):
        """400 with a reason that names the actual problem: no tutor yet."""
        when = datetime.utcnow() + timedelta(days=1)
        async with make_client(db_session, admin_user) as ac:
            response = await ac.post("/api/v1/admin/classes", json={
                "learner_id": learner_user.id,
                "title": "First lesson",
                "scheduled_at": when.isoformat(),
            })
        assert response.status_code == 400
        assert "tutor" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_a_lesson_cannot_be_scheduled_in_the_past(
        self, db_session, admin_user, tutor_user, assigned_learner
    ):
        when = datetime.utcnow() - timedelta(hours=2)
        async with make_client(db_session, admin_user) as ac:
            response = await ac.post("/api/v1/admin/classes", json={
                "learner_id": assigned_learner.id,
                "title": "Time travel",
                "scheduled_at": when.isoformat(),
            })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_an_unknown_learner_is_refused_with_404(
        self, db_session, admin_user
    ):
        when = datetime.utcnow() + timedelta(days=1)
        async with make_client(db_session, admin_user) as ac:
            response = await ac.post("/api/v1/admin/classes", json={
                "learner_id": 999999,
                "title": "Ghost lesson",
                "scheduled_at": when.isoformat(),
            })
        assert response.status_code == 404
