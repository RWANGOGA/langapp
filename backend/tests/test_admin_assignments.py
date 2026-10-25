"""Assigning a learner to a tutor is the operation the whole school exists
for, and until now none of it was covered by a single test - the endpoints
could change behaviour silently.

Under test: `/admin/assign-student`, `/admin/unassign-student/{id}` and the
rule that an administrator must be able to move a learner from one approved
tutor to another without first deleting the assignment. The old code answered
a reassignment with a 400 and made the admin unassign, then assign - two
calls, one of which briefly leaves the learner with no tutor at all.
"""
import pytest
import pytest_asyncio

from app.models.notification import Notification
from app.models.user import TutorProfile, User, UserRole
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    other_tutor_user,
    learner_user,
    make_client,
)


@pytest_asyncio.fixture
async def admin_user(db_session):
    admin = User(
        email="admin.assign@example.com",
        hashed_password="x",
        full_name="Assigning Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


async def approve(db_session, tutor: User):
    """Only approved profiles may take learners - the same gate the review
    queue raises when it promotes an applicant."""
    db_session.add(TutorProfile(
        user_id=tutor.id,
        country="Kenya",
        is_approved=True,
        rating=4.8,
    ))
    await db_session.commit()


async def notifications_for(db_session, user_id: int):
    result = await db_session.execute(
        Notification.__table__.select().where(Notification.recipient_id == user_id)
    )
    return [row._mapping for row in result]


class TestFirstAssignment:
    @pytest.mark.asyncio
    async def test_assigning_moves_the_learner_and_tells_everyone(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        await approve(db_session, tutor_user)

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": learner_user.id, "tutor_id": tutor_user.id},
            )
        assert response.status_code == 200

        await db_session.refresh(learner_user)
        assert learner_user.tutor_id == tutor_user.id

        student_notes = await notifications_for(db_session, learner_user.id)
        tutor_notes = await notifications_for(db_session, tutor_user.id)
        admin_notes = await notifications_for(db_session, admin_user.id)
        assert any(n.notification_type == "tutor_assigned" for n in student_notes), (
            "the learner must learn who their tutor is"
        )
        assert any(n.notification_type == "learner_assigned" for n in tutor_notes), (
            "the tutor must learn they gained a learner"
        )
        assert any(n.notification_type == "assignment_created" for n in admin_notes)

    @pytest.mark.asyncio
    async def test_an_unapproved_tutor_cannot_take_a_learner(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        """The profile exists but was never approved - assigning to it would
        put a learner in the hands of someone the school has not vetted."""
        db_session.add(TutorProfile(user_id=tutor_user.id, country="Kenya", is_approved=False))
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": learner_user.id, "tutor_id": tutor_user.id},
            )
        assert response.status_code == 400

        await db_session.refresh(learner_user)
        assert learner_user.tutor_id is None

    @pytest.mark.asyncio
    async def test_a_unknown_learner_is_refused_with_404(
        self, db_session, admin_user, tutor_user
    ):
        await approve(db_session, tutor_user)

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": 999999, "tutor_id": tutor_user.id},
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_a_tutor_cannot_be_assigned_as_a_learner(
        self, db_session, admin_user, tutor_user, other_tutor_user
    ):
        await approve(db_session, tutor_user)
        await approve(db_session, other_tutor_user)

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": other_tutor_user.id, "tutor_id": tutor_user.id},
            )
        assert response.status_code == 400


class TestReassignment:
    """The red half: an admin moving a learner between two approved tutors
    must be one action, not unassign-then-assign."""

    @pytest.mark.asyncio
    async def test_a_learner_moves_from_one_approved_tutor_to_another(
        self, db_session, admin_user, tutor_user, other_tutor_user, learner_user
    ):
        await approve(db_session, tutor_user)
        await approve(db_session, other_tutor_user)
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": learner_user.id, "tutor_id": other_tutor_user.id},
            )
        assert response.status_code == 200, (
            "reassigning to a different approved tutor is a normal admin move, "
            "not a conflict to be punished with a 400"
        )

        await db_session.refresh(learner_user)
        assert learner_user.tutor_id == other_tutor_user.id

    @pytest.mark.asyncio
    async def test_the_move_notifies_everyone_involved(
        self, db_session, admin_user, tutor_user, other_tutor_user, learner_user
    ):
        await approve(db_session, tutor_user)
        await approve(db_session, other_tutor_user)
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": learner_user.id, "tutor_id": other_tutor_user.id},
            )

        student_notes = await notifications_for(db_session, learner_user.id)
        old_tutor_notes = await notifications_for(db_session, tutor_user.id)
        new_tutor_notes = await notifications_for(db_session, other_tutor_user.id)
        assert any(n.notification_type == "tutor_assigned" for n in student_notes), (
            "the learner must be told who their tutor is now"
        )
        assert any(n.notification_type == "learner_unassigned" for n in old_tutor_notes), (
            "the previous tutor must learn the learner is no longer theirs"
        )
        assert any(n.notification_type == "learner_assigned" for n in new_tutor_notes)

    @pytest.mark.asyncio
    async def test_reassigning_to_the_same_tutor_is_not_an_error(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        await approve(db_session, tutor_user)
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.post(
                "/api/v1/admin/assign-student",
                json={"student_id": learner_user.id, "tutor_id": tutor_user.id},
            )
        assert response.status_code == 200


class TestUnassignment:
    @pytest.mark.asyncio
    async def test_unassigning_clears_the_link(
        self, db_session, admin_user, tutor_user, learner_user
    ):
        await approve(db_session, tutor_user)
        learner_user.tutor_id = tutor_user.id
        await db_session.commit()

        async with make_client(db_session, admin_user) as ac:
            response = await ac.delete(f"/api/v1/admin/unassign-student/{learner_user.id}")
        assert response.status_code == 200

        await db_session.refresh(learner_user)
        assert learner_user.tutor_id is None

        student_notes = await notifications_for(db_session, learner_user.id)
        assert any(n.notification_type == "tutor_unassigned" for n in student_notes)

    @pytest.mark.asyncio
    async def test_unassigning_a_learner_with_no_tutor_is_refused(
        self, db_session, admin_user, learner_user
    ):
        async with make_client(db_session, admin_user) as ac:
            response = await ac.delete(f"/api/v1/admin/unassign-student/{learner_user.id}")
        assert response.status_code == 400
        assert "not currently assigned" in response.json()["detail"]
