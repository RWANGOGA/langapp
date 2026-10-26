"""Testimonials: what a learner or tutor can say about us, and what we publish.

The public /testimonials page is built from real accounts. The promises here
are the ones that keep it trustworthy:

- the author's name and identity come from their own account, never from the
  request body, so nobody can post a quote and sign it with someone else's name
  or invent a title;
- one person, one testimonial - writing again edits the same record;
- a pilot note is stored and served as a pilot note, so the page can label it
  instead of letting it pass as a paying customer's review;
- the wall is open to signed-in learners and approved tutors, and to nobody else.
"""
import contextlib

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.session import get_db
from app.main import app
from app.models.notification import Notification
from app.models.testimonial import Testimonial, TestimonialKind
from app.models.user import TutorProfile

from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_user,
    db_session,
    learner_user,
    make_client,
    tutor_user,
)

MINE = "/api/v1/testimonials/mine"
PUBLIC = "/api/v1/testimonials"

QUOTE = (
    "I had studied grammar for six years and still could not order a coffee. "
    "Three months of one-to-one lessons and I now run my own team meetings."
)


def _body(quote: str = QUOTE, region: str = "Kampala, Uganda") -> dict:
    return {"quote": quote, "region": region}


@contextlib.asynccontextmanager
async def _anonymous(db):
    """Only get_db is overridden, so the auth dependency is really enforced.

    The overrides are cleared on entry as well: make_client leaves a signed-in
    `get_current_user` behind for the rest of the module, and this test has to
    prove the endpoint refuses an empty request, not a borrowed identity.
    """
    async def _override_get_db():
        yield db

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_a_learner_can_write_and_appears_publicly(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        res = await client.put(MINE, json=_body())
        assert res.status_code == 200, res.text

        listing = (await client.get(PUBLIC)).json()

    items = listing["testimonials"]
    assert len(items) == 1
    assert items[0]["quote"] == QUOTE
    assert items[0]["name"] == learner_user.full_name
    assert items[0]["kind"] == "LEARNER"
    assert items[0]["region"] == "Kampala, Uganda"
    assert items[0]["is_pilot_note"] is False


@pytest.mark.asyncio
async def test_an_approved_tutor_is_labelled_a_tutor(db_session, tutor_user):
    db_session.add(
        TutorProfile(user_id=tutor_user.id, rating=4.9, reviews_count=12, is_approved=True)
    )
    await db_session.commit()

    async with make_client(db_session, tutor_user) as client:
        res = await client.put(MINE, json=_body(region="Lyon, France"))
        assert res.status_code == 200, res.text
        item = (await client.get(PUBLIC)).json()["testimonials"][0]

    assert item["kind"] == "TUTOR"


@pytest.mark.asyncio
async def test_the_request_body_cannot_choose_the_author(db_session, learner_user):
    """Name and identity are the account's, not the payload's."""
    async with make_client(db_session, learner_user) as client:
        res = await client.put(
            MINE,
            json={**_body(), "name": "Somebody Else", "kind": "ADMIN", "user_id": 999},
        )
        assert res.status_code == 200, res.text

    row = await db_session.scalar(
        select(Testimonial).where(Testimonial.user_id == learner_user.id)
    )
    assert row.author_name == learner_user.full_name
    assert row.author_kind == TestimonialKind.LEARNER
    assert row.user_id == learner_user.id


@pytest.mark.asyncio
async def test_writing_again_edits_the_same_testimonial(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        await client.put(MINE, json=_body())
        res = await client.put(
            MINE, json=_body(quote="Rewritten: the weekly cycle is what worked for me.")
        )
        assert res.status_code == 200, res.text
        listing = (await client.get(PUBLIC)).json()

    rows = (await db_session.scalars(select(Testimonial))).all()
    assert len(rows) == 1
    assert rows[0].author_name == learner_user.full_name
    assert listing["testimonials"][0]["quote"] == "Rewritten: the weekly cycle is what worked for me."


@pytest.mark.asyncio
async def test_an_author_can_withdraw_their_words(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        await client.put(MINE, json=_body())
        res = await client.delete(MINE)
        assert res.status_code == 204

    assert await db_session.scalar(select(func.count(Testimonial.id))) == 0


@pytest.mark.asyncio
async def test_a_thin_quote_is_refused(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        short = await client.put(MINE, json=_body(quote="Great school."))
        long = await client.put(MINE, json=_body(quote=QUOTE * 6))

    assert short.status_code == 422
    assert long.status_code == 422
    assert await db_session.scalar(select(func.count(Testimonial.id))) == 0


@pytest.mark.asyncio
async def test_nobody_can_write_from_outside(db_session):
    """An anonymous visitor has no account to attribute words to."""
    async with _anonymous(db_session) as client:
        res = await client.put(MINE, json=_body())

    assert res.status_code in (401, 403)
    assert await db_session.scalar(select(func.count(Testimonial.id))) == 0


@pytest.mark.asyncio
async def test_the_wall_is_readable_without_an_account(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        await client.put(MINE, json=_body())

    async with _anonymous(db_session) as anon:
        res = await anon.get(PUBLIC)

    assert res.status_code == 200
    assert res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_a_pilot_note_is_served_as_one(db_session):
    """The seeded notes have no account behind them and must not pretend to.

    They are stored with the pilot flag so the page can label them; a real
    person's testimonial is the only thing that reads as a review.
    """
    db_session.add(Testimonial(
        author_name="Pilot cohort · Gulf",
        author_kind=TestimonialKind.PILOT,
        author_region="Sharjah, UAE",
        quote="Two learners, forty weeks, one shared notebook of phrases they "
              "actually used at work.",
        is_pilot_note=True,
    ))
    await db_session.commit()

    async with _anonymous(db_session) as anon:
        item = (await anon.get(PUBLIC)).json()["testimonials"][0]

    assert item["is_pilot_note"] is True
    assert item["kind"] == "PILOT"


@pytest.mark.asyncio
async def test_every_admin_hears_about_a_new_testimonial(db_session, learner_user, admin_user):
    async with make_client(db_session, learner_user) as client:
        await client.put(MINE, json=_body())

    notices = (
        await db_session.scalars(
            select(Notification).where(Notification.notification_type == "testimonial_written")
        )
    ).all()
    assert len(notices) == 1
    assert notices[0].recipient_id == admin_user.id
