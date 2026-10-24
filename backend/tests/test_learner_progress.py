"""
Step 5 - learner progress from real session data (red-first).

The dashboard used to hardcode progress = {percent: 0, completed: 0,
total: 0}. The definition now built:

  completed = this learner's classes with status COMPLETED
  total     = classes the learner still has to sit through and the ones
              they sat: COMPLETED + SCHEDULED (cancelled and no-show
              sessions are excluded from both sides - a cancelled class
              is not part of anyone's progress, and a no-show is not a
              completed lesson)
  percent   = round(completed / total * 100), 0 when nothing is on plan

`level` stays the stored proficiency level - progress percentage is about
lesson delivery, CEFR advancement is a tutor judgement.
"""
import pytest

from tests.sqlite_fixtures import db_session, learner_user, make_class, make_client  # noqa: F401
from app.models.user import ClassStatus

BASE = "/api/v1/learner/dashboard"


@pytest.mark.asyncio
async def test_progress_counts_completed_against_scheduled_plan(
    db_session, learner_user  # noqa: F811
):
    from sqlalchemy import select
    from app.models.user import User
    tutor = User(
        email="progress.tutor@example.com", hashed_password="x",
        full_name="P Tutor", role="tutor", is_active=True,
    )
    db_session.add(tutor)
    await db_session.commit()
    await db_session.refresh(tutor)

    def cls(status, hours):
        c = make_class(tutor.id, learner_user.id, hours_from_now=hours)
        c.status = status
        return c

    # 2 completed, 3 upcoming, 1 cancelled, 1 no-show.
    for c in [
        cls(ClassStatus.COMPLETED, -48), cls(ClassStatus.COMPLETED, -24),
        cls(ClassStatus.SCHEDULED, 2), cls(ClassStatus.SCHEDULED, 26),
        cls(ClassStatus.SCHEDULED, 50),
        cls(ClassStatus.CANCELLED, 5), cls(ClassStatus.NO_SHOW, -2),
    ]:
        db_session.add(c)
    await db_session.commit()

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(BASE)
        assert r.status_code == 200, r.text
        progress = r.json()["progress"]

    assert progress["completed"] == 2
    assert progress["total"] == 5          # completed + still-scheduled
    assert progress["percent"] == 40
    assert progress["level"] == learner_user.proficiency_level.value


@pytest.mark.asyncio
async def test_progress_is_zero_without_any_classes(db_session, learner_user):  # noqa: F811
    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(BASE)
        assert r.status_code == 200, r.text
        progress = r.json()["progress"]
    assert progress == {
        "percent": 0,
        "level": learner_user.proficiency_level.value,
        "completed": 0,
        "total": 0,
    }


@pytest.mark.asyncio
async def test_unselected_level_is_honest_not_a_letter(db_session):  # noqa: F811
    """A learner who never picked a level must not be shown a fabricated B1."""
    from app.models.user import User, UserRole

    fresh = User(
        email="nofresh-level@example.com", hashed_password="x",
        full_name="Fresh Face", role=UserRole.STUDENT, is_active=True,
        proficiency_level=None,
    )
    db_session.add(fresh)
    await db_session.commit()

    async with make_client(db_session, fresh) as learner:
        r = await learner.get(BASE)
        assert r.status_code == 200, r.text
        body = r.json()
    assert body["learner"]["level"] == "Not set"
    assert body["progress"]["level"] == "Not set"


@pytest.mark.asyncio
async def test_payload_carries_only_fields_the_ui_uses(db_session, learner_user):  # noqa: F811
    """Dead payload fields invite drift; the dashboard renders from startsAt."""
    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(BASE)
        body = r.json()
    assert "today" not in body
    for item in body["classes"]:
        assert "date" not in item and "time" not in item


@pytest.mark.asyncio
async def test_cancelled_only_plan_does_not_divide_by_zero(db_session, learner_user):  # noqa: F811
    from app.models.user import User
    t = User(
        email="cancel-only.tutor@example.com", hashed_password="x",
        full_name="C Tutor", role="tutor", is_active=True,
    )
    db_session.add(t)
    await db_session.commit()
    c = make_class(t.id, learner_user.id, hours_from_now=3)
    c.status = ClassStatus.CANCELLED
    db_session.add(c)
    await db_session.commit()

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(BASE)
        assert r.status_code == 200, r.text
        progress = r.json()["progress"]
    assert progress["total"] == 0
    assert progress["percent"] == 0


@pytest.mark.asyncio
async def test_all_done_plan_reads_one_hundred(db_session, learner_user):  # noqa: F811
    from app.models.user import User
    t = User(
        email="done.tutor@example.com", hashed_password="x",
        full_name="D Tutor", role="tutor", is_active=True,
    )
    db_session.add(t)
    await db_session.commit()
    for hours in (-72, -48, -24):
        c = make_class(t.id, learner_user.id, hours_from_now=hours)
        c.status = ClassStatus.COMPLETED
        db_session.add(c)
    await db_session.commit()

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(BASE)
        progress = r.json()["progress"]
    assert progress["completed"] == 3
    assert progress["total"] == 3
    assert progress["percent"] == 100
