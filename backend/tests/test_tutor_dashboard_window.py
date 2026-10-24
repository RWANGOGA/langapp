"""The tutor dashboard is a working surface, not a today-only view.

The tutor portal renders one list of sessions that feeds three places:
today's list, the "upcoming" list and the month calendar. If the endpoint
only returns classes scheduled for the current UTC day, "upcoming" and the
calendar are always empty and the UI silently lies.

Under test: `/tutor/dashboard` returns the schedule window - today plus the
next 30 days of scheduled classes - ordered by start time, and excludes
history and anything beyond the window.
"""
import pytest
from datetime import datetime

from app.models.user import ClassStatus, TutorProfile
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    make_class,
    make_client,
)


class TestTutorDashboardWindow:
    @pytest.mark.asyncio
    async def test_sessions_include_future_classes_not_only_today(
        self, db_session, tutor_user, learner_user
    ):
        db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
        soon = make_class(tutor_user.id, learner_user.id, hours_from_now=2.0)
        later = make_class(tutor_user.id, learner_user.id, hours_from_now=24 * 3)
        db_session.add_all([soon, later])
        await db_session.commit()
        await db_session.refresh(tutor_user, ["tutor_profile"])

        async with make_client(db_session, tutor_user) as ac:
            response = await ac.get("/api/v1/tutor/dashboard")
        assert response.status_code == 200
        sessions = response.json()["sessions"]

        assert [s["id"] for s in sessions] == [f"s{soon.id}", f"s{later.id}"], (
            "a class three days out must still be listed, after today's classes"
        )

    @pytest.mark.asyncio
    async def test_window_excludes_history_and_far_future(
        self, db_session, tutor_user, learner_user
    ):
        db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
        past = make_class(tutor_user.id, learner_user.id, hours_from_now=-24 * 5)
        past.status = ClassStatus.COMPLETED
        far = make_class(tutor_user.id, learner_user.id, hours_from_now=24 * 60)
        db_session.add_all([past, far])
        await db_session.commit()
        await db_session.refresh(tutor_user, ["tutor_profile"])

        async with make_client(db_session, tutor_user) as ac:
            response = await ac.get("/api/v1/tutor/dashboard")
        sessions = response.json()["sessions"]

        assert sessions == [], "history and classes beyond the window stay out of the list"

    @pytest.mark.asyncio
    async def test_cancelled_classes_are_kept_for_the_same_day(
        self, db_session, tutor_user, learner_user
    ):
        """A learner needs to see that today's class was cancelled, not a gap."""
        db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
        cancelled = make_class(tutor_user.id, learner_user.id, hours_from_now=1.0)
        cancelled.status = ClassStatus.CANCELLED
        db_session.add(cancelled)
        await db_session.commit()
        await db_session.refresh(tutor_user, ["tutor_profile"])

        async with make_client(db_session, tutor_user) as ac:
            response = await ac.get("/api/v1/tutor/dashboard")
        sessions = response.json()["sessions"]

        assert len(sessions) == 1
        assert sessions[0]["status"] == "cancelled"
        assert sessions[0]["startsAt"].endswith("+00:00")
