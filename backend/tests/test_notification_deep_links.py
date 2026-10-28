"""A notification should be actionable, not just readable.

Each row now carries the relative screen that resolves it, chosen from the
event type and the recipient's role, so the same event can land a learner on
their dashboard and a tutor on their schedule. Events with no real surface
store a null link rather than a button to the wrong place. These tests pin the
mapping and prove it is written at creation time, end to end.
"""
import pytest
from sqlalchemy import select

from app.models.notification import Notification
from app.models.user import UserRole
from app.services.notifications import link_for, notify_user

from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_user,
    client,
    db_session,
    learner_user,
    tutor_user,
)

BODY = (
    "I would like to know whether the six-month package can be paid in two "
    "instalments, and whether a tutor who speaks Spanish is available."
)


def test_the_map_sends_each_reader_to_the_right_screen():
    assert link_for("contact_message", UserRole.ADMIN) == "/admin/messages"
    assert link_for("testimonial_written", UserRole.ADMIN) == "/testimonials"
    assert link_for("tutor_assigned", UserRole.STUDENT) == "/dashboard/tutors"
    assert link_for("lesson_feedback", UserRole.STUDENT) == "/dashboard/progress"
    assert link_for("learner_assigned", UserRole.TUTOR) == "/tutor/learners"
    assert link_for("tutor_application_approved", UserRole.TUTOR) == "/tutor"


def test_one_event_lands_differently_per_reader():
    # Scheduling a class is not one screen: the learner sees their dashboard,
    # the tutor sees the schedule that holds the lesson.
    assert link_for("class_scheduled", UserRole.STUDENT) == "/dashboard"
    assert link_for("class_scheduled", UserRole.TUTOR) == "/tutor/schedule"


def test_an_event_without_a_home_stays_unlinked():
    # Nothing should pretend a click goes somewhere it does not.
    assert link_for("class_scheduled", UserRole.ADMIN) is None
    assert link_for("some_future_type", UserRole.STUDENT) is None
    assert link_for("contact_message", None) is None


@pytest.mark.asyncio
async def test_notify_user_writes_the_link_at_creation(db_session, learner_user, tutor_user):
    await notify_user(db_session, learner_user.id, "tutor_assigned", "t", "m")
    await notify_user(db_session, tutor_user.id, "learner_assigned", "t", "m")
    await notify_user(db_session, learner_user.id, "some_future_type", "t", "m")
    await db_session.commit()

    rows = {
        n.notification_type: n
        for n in (await db_session.execute(select(Notification))).scalars().all()
    }
    assert rows["tutor_assigned"].link == "/dashboard/tutors"
    assert rows["learner_assigned"].link == "/tutor/learners"
    assert rows["some_future_type"].link is None


@pytest.mark.asyncio
async def test_a_contact_message_links_the_admin_inbox(db_session, admin_user, client):
    response = await client.post(
        "/api/v1/contact",
        json={"name": "Marta Reyes", "email": "marta.reyes@example.com", "topic": "pricing", "message": BODY},
    )
    assert response.status_code == 201, response.text

    notice = (
        await db_session.execute(select(Notification).where(Notification.notification_type == "contact_message"))
    ).scalars().all()
    assert len(notice) == 1
    assert notice[0].recipient_id == admin_user.id
    assert notice[0].link == "/admin/messages"
