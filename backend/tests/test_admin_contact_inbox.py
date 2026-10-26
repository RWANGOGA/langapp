"""The admin half of the contact form: what strangers wrote, gathered where a
member of staff can work through it, and the answer we send back.

No email provider is wired into this deployment, so these tests pin the promise
the system can actually keep:

- every message is stored and listed for staff, newest first, with open and
  answered counts that make the queue measurable rather than vibes;
- a reply is recorded against the message with who wrote it and when, and the
  thread can be reopened without losing what was said;
- if the sender turns out to hold an account, the answer lands in their inbox as
  an in-app notification - a reply that only exists inside the admin tool has
  not reached anybody;
- none of it is readable by anyone who is not staff.
"""
import contextlib
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.api.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.contact_message import ContactMessage
from app.models.notification import Notification
from app.models.user import User, UserRole

from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_client,
    admin_user,
    db_session,
    learner_user,
)

INBOX = "/api/v1/admin/messages"

BODY = (
    "I would like to know whether the six-month package can be paid in two "
    "instalments, and whether a tutor who speaks Spanish is available."
)
ANSWER = (
    "Yes - the six-month plan can be split into two payments, and we have a "
    "tutor in Barcelona who teaches in Spanish and English."
)


@pytest_asyncio.fixture
async def anon_client(db_session):
    """No `get_current_user` override: a visitor with no account at all."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _post_message(anon_client, **overrides):
    fields = dict(name="Marta Reyes", email="marta.reyes@example.com", topic="pricing", message=BODY)
    fields.update(overrides)
    response = await anon_client.post("/api/v1/contact", json=fields)
    assert response.status_code == 201, response.text


async def _seed(db_session, **overrides):
    """Write a thread straight to the table so a test can control its age."""
    fields = dict(
        name="Marta Reyes",
        email="marta.reyes@example.com",
        topic="pricing",
        message=BODY,
        is_handled=False,
        created_at=datetime.utcnow() - timedelta(days=1),
    )
    fields.update(overrides)
    row = ContactMessage(**fields)
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)
    return row


@pytest.mark.asyncio
async def test_the_inbox_lists_what_a_stranger_sent(admin_client, db_session, anon_client):
    await _post_message(anon_client)

    response = await admin_client.get(INBOX)
    assert response.status_code == 200, response.text
    page = response.json()

    assert page["total"] == 1
    assert page["open"] == 1
    assert page["answered"] == 0
    row = page["messages"][0]
    assert row["name"] == "Marta Reyes"
    assert row["email"] == "marta.reyes@example.com"
    assert row["topic"] == "pricing"
    assert row["message"] == BODY
    assert row["is_handled"] is False
    assert row["reply"] is None


@pytest.mark.asyncio
async def test_the_newest_thread_sits_on_top(admin_client, db_session):
    old = await _seed(db_session, created_at=datetime.utcnow() - timedelta(days=3))
    recent = await _seed(db_session, name="Idris Farouk", email="idris@example.com",
                         created_at=datetime.utcnow() - timedelta(hours=2))

    page = (await admin_client.get(INBOX)).json()

    assert [row["id"] for row in page["messages"]] == [recent.id, old.id]


@pytest.mark.asyncio
async def test_a_reply_is_recorded_and_closes_the_thread(admin_client, db_session, admin_user):
    row = await _seed(db_session)

    response = await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": ANSWER})
    assert response.status_code == 200, response.text
    assert response.json()["is_handled"] is True

    await db_session.refresh(row)
    assert row.reply == ANSWER
    assert row.replied_by == admin_user.id
    assert row.replied_at is not None

    page = (await admin_client.get(INBOX)).json()
    assert page["open"] == 0
    assert page["answered"] == 1
    assert page["messages"][0]["reply"] == ANSWER
    # The queue names who answered. "Handled" without a person behind it is not
    # something a second administrator can check or pick up.
    assert page["messages"][0]["replied_by_name"] == admin_user.full_name


@pytest.mark.asyncio
async def test_an_answer_reaches_a_sender_who_has_an_account(admin_client, db_session):
    """The point of replying is that the other person reads it."""
    sender = User(
        email="marta.reyes@example.com",
        hashed_password="x",
        full_name="Marta Reyes",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(sender)
    await db_session.commit()
    row = await _seed(db_session)

    await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": ANSWER})

    notice = (
        await db_session.execute(
            select(Notification).where(Notification.notification_type == "contact_reply")
        )
    ).scalars().all()
    assert len(notice) == 1
    assert notice[0].recipient_id == sender.id
    assert ANSWER in notice[0].message


@pytest.mark.asyncio
async def test_a_reply_to_a_stranger_without_an_account_is_still_recorded(admin_client, db_session):
    row = await _seed(db_session)

    response = await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": ANSWER})

    assert response.status_code == 200
    await db_session.refresh(row)
    assert row.reply == ANSWER
    notices = (
        await db_session.execute(select(Notification).where(Notification.notification_type == "contact_reply"))
    ).scalars().all()
    assert notices == []


@pytest.mark.asyncio
async def test_reopening_keeps_what_was_said(admin_client, db_session):
    row = await _seed(db_session)
    await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": ANSWER})

    response = await admin_client.post(f"{INBOX}/{row.id}/reopen", json={})
    assert response.status_code == 200
    assert response.json()["is_handled"] is False

    await db_session.refresh(row)
    assert row.reply == ANSWER
    assert row.replied_at is not None


@pytest.mark.asyncio
async def test_writing_again_revises_the_same_answer(admin_client, db_session):
    row = await _seed(db_session)
    second = "Correcting myself: the six-month plan splits into three payments, not two."

    await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": ANSWER})
    await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": second})

    await db_session.refresh(row)
    assert row.reply == second
    assert len((await db_session.execute(select(ContactMessage))).scalars().all()) == 1


@pytest.mark.asyncio
async def test_an_answer_with_no_substance_is_refused(admin_client, db_session):
    row = await _seed(db_session)

    response = await admin_client.post(f"{INBOX}/{row.id}/reply", json={"reply": "ok"})

    assert response.status_code == 422
    await db_session.refresh(row)
    assert row.reply is None


@pytest.mark.asyncio
async def test_the_queue_can_be_filtered_to_the_work_left(admin_client, db_session):
    await _seed(db_session, is_handled=True, reply=ANSWER, replied_at=datetime.utcnow())
    open_row = await _seed(db_session, name="Amina Yusuf", email="amina@example.com")

    open_page = (await admin_client.get(f"{INBOX}?state=open")).json()
    answered_page = (await admin_client.get(f"{INBOX}?state=answered")).json()

    assert [row["id"] for row in open_page["messages"]] == [open_row.id]
    assert answered_page["total"] == 1
    assert answered_page["messages"][0]["is_handled"] is True


@pytest.mark.asyncio
async def test_a_thread_that_does_not_exist_is_not_invented(admin_client, db_session):
    response = await admin_client.post(f"{INBOX}/9999/reply", json={"reply": ANSWER})

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_the_inbox_is_not_a_public_square(db_session, admin_user, learner_user):
    """Staff-only: it holds other people's email addresses and complaints.

    Each identity gets its own client block. `make_client` writes into the one
    shared `dependency_overrides` dict, so two clients open at once would both
    act as whoever was installed last - an administrator in disguise.
    """
    await _seed(db_session)

    async with _signed_in_as(db_session, learner_user) as learner:
        assert (await learner.get(INBOX)).status_code == 403
    async with _signed_in_as(db_session, admin_user) as admin:
        assert (await admin.get(INBOX)).status_code == 200
    async with _signed_in_as(db_session, None) as stranger:
        assert (await stranger.get(INBOX)).status_code == 401


@contextlib.asynccontextmanager
async def _signed_in_as(db_session, acting_user):
    """A client whose only identity is `acting_user` (None = nobody)."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    if acting_user is not None:
        app.dependency_overrides[get_current_user] = lambda: acting_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_a_busy_inbox_arrives_a_page_at_a_time(admin_client, db_session):
    """The queue is capped, and the counts still describe the whole queue.

    A school that grows must not have to fetch every enquiry ever written
    before it can read the newest one - and a filter that reported the size of
    its own page would tell the reader the work had shrunk.
    """
    for day in range(30):
        await _seed(db_session, created_at=datetime.utcnow() - timedelta(days=day))

    first = (await admin_client.get(INBOX, params={"limit": 10})).json()
    assert len(first["messages"]) == 10
    assert first["total"] == 30
    assert first["open"] == 30

    second = (await admin_client.get(INBOX, params={"limit": 10, "offset": 10})).json()
    seen = {row["id"] for row in first["messages"]}
    assert {row["id"] for row in second["messages"]}.isdisjoint(seen)
    assert second["messages"][0]["created_at"] < first["messages"][-1]["created_at"]


@pytest.mark.asyncio
async def test_a_page_cannot_be_asked_for_too_much(admin_client, db_session):
    await _seed(db_session)

    assert (await admin_client.get(INBOX, params={"limit": 500})).status_code == 422
