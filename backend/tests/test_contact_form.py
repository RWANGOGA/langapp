"""The public contact form: a stranger with no account must be able to reach a
human, and the message must land somewhere an admin can actually read it.

The page is open to anyone, so these tests pin three things: a valid message is
stored and raises an admin notification, a message with too little substance is
refused instead of being written, and no account is required to post.
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.session import get_db
from app.main import app
from app.models.notification import Notification
from app.models.user import User, UserRole

from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    admin_user,
)

CONTACT = "/api/v1/contact"


@pytest_asyncio.fixture
async def anon_client(db_session):
    """No `get_current_user` override: this is a visitor with no account."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def _payload(**overrides):
    fields = dict(
        name="Marta Reyes",
        email="marta.reyes@example.com",
        topic="pricing",
        message="I would like to know whether the six-month package can be paid in two instalments.",
    )
    fields.update(overrides)
    return fields


@pytest.mark.asyncio
async def test_a_message_from_a_stranger_is_stored_and_reaches_an_admin(anon_client, db_session, admin_user):
    from app.models.contact_message import ContactMessage

    response = await anon_client.post(CONTACT, json=_payload())
    assert response.status_code == 201
    stored = (await db_session.execute(select(ContactMessage))).scalars().all()
    assert len(stored) == 1
    assert stored[0].email == "marta.reyes@example.com"
    assert stored[0].topic == "pricing"
    assert stored[0].is_handled is False

    notices = (await db_session.execute(select(Notification))).scalars().all()
    assert len(notices) == 1
    assert notices[0].recipient_id == admin_user.id
    assert "Marta Reyes" in notices[0].title
    assert "marta.reyes@example.com" in notices[0].message


@pytest.mark.asyncio
async def test_a_message_with_no_substance_is_refused(anon_client, db_session):
    from app.models.contact_message import ContactMessage

    response = await anon_client.post(CONTACT, json=_payload(message="hi"))

    assert response.status_code == 422
    assert (await db_session.execute(select(ContactMessage))).scalars().all() == []


@pytest.mark.asyncio
async def test_an_invalid_address_is_refused(anon_client):
    response = await anon_client.post(CONTACT, json=_payload(email="not-an-address"))

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_no_account_is_needed_to_write(anon_client, admin_user):
    """`client` is not signed in as anyone: the form must still work."""
    response = await anon_client.post(CONTACT, json=_payload(topic="other"))

    assert response.status_code == 201


@pytest.mark.asyncio
async def test_every_admin_hears_about_it(anon_client, db_session, admin_user):
    """A school with two administrators must not route the form to one inbox."""
    second = User(
        email="admin.two@example.com",
        hashed_password="x",
        full_name="Second Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(second)
    await db_session.commit()

    await anon_client.post(CONTACT, json=_payload())

    notices = (await db_session.execute(select(Notification))).scalars().all()
    assert {n.recipient_id for n in notices} == {admin_user.id, second.id}
