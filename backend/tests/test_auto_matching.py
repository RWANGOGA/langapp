"""Scoring engine and placement audit for automatic learner-to-tutor matching.

Red first: every test here names the behaviour the matching service must have
once thousands of paid learners arrive - the best tutor wins on evidence, the
evidence is kept, and a human can read it back afterwards.
"""
from datetime import datetime

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.package import Order, OrderStatus
from app.models.user import (
    TutorAvailability,
    TutorProfile,
    TutorProfileLanguage,
    TutorProfileSpecialty,
    User,
    UserRole,
)
from app.services.order_fulfillment import match_paid_student
from app.services.tutor_matching import rank_tutors_for_learner

from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_user,
    db_session,
    learner_user,
    make_client,
    make_order,
    starter_package,
)


async def approved_tutor(
    db,
    *,
    email,
    full_name,
    languages=(),
    specialties=(),
    timezone=None,
    availability=(),
    learners=(),
):
    """An approved tutor carrying exactly the profile facts the engine reads."""
    tutor = User(
        email=email,
        hashed_password="x",
        full_name=full_name,
        role=UserRole.TUTOR,
        timezone=timezone,
        is_active=True,
    )
    db.add(tutor)
    await db.flush()
    profile = TutorProfile(user_id=tutor.id, is_approved=True)
    db.add(profile)
    await db.flush()
    for language in languages:
        db.add(TutorProfileLanguage(profile_id=profile.id, language=language))
    for specialty in specialties:
        db.add(TutorProfileSpecialty(profile_id=profile.id, specialty=specialty))
    for day, start, end, zone in availability:
        db.add(TutorAvailability(
            profile_id=profile.id, day_of_week=day,
            start_time=start, end_time=end, timezone=zone,
        ))
    for learner in learners:
        learner.tutor_id = tutor.id
        learner.tutor_assigned_at = datetime.utcnow()
    await db.commit()
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.tutor_profile).selectinload(TutorProfile.specialties),
            selectinload(User.tutor_profile).selectinload(TutorProfile.languages),
            selectinload(User.tutor_profile).selectinload(TutorProfile.availability),
        )
        .where(User.id == tutor.id)
    )
    return result.scalar_one()


async def plain_student(db, email, full_name="Plain Student"):
    """A student with no tutor until the test gives them one."""
    student = User(
        email=email, hashed_password="x", full_name=full_name,
        role=UserRole.STUDENT, is_active=True,
    )
    db.add(student)
    await db.commit()
    return student


@pytest_asyncio.fixture
async def arabic_learner(db_session, learner_user):
    learner_user.native_language = "Arabic"
    learner_user.timezone = "Asia/Dubai"
    await db_session.commit()
    return learner_user


@pytest.mark.asyncio
async def test_the_language_match_beats_lower_id(db_session, starter_package, arabic_learner, make_order):
    low = await approved_tutor(db_session, email="t.low@example.com", full_name="Low Id", languages=["French"])
    high = await approved_tutor(db_session, email="t.high@example.com", full_name="High Id", languages=["Arabic"])
    assert low.id < high.id  # the old order-by-id would have picked the wrong one
    order = await make_order(subject="General English")

    ranked = await rank_tutors_for_learner(db_session, arabic_learner, order)

    assert ranked[0].tutor.id == high.id
    assert any("Arabic" in reason for reason in ranked[0].reasons)


@pytest.mark.asyncio
async def test_the_subject_specialty_is_credited_and_named(db_session, starter_package, learner_user, make_order):
    general = await approved_tutor(db_session, email="t.gen@example.com", full_name="General", specialties=["General English"])
    business = await approved_tutor(db_session, email="t.biz@example.com", full_name="Business", specialties=["Business English"])
    order = await make_order(subject="Business English")

    ranked = await rank_tutors_for_learner(db_session, learner_user, order)

    assert ranked[0].tutor.id == business.id
    assert any("Specialises in Business English" == reason for reason in ranked[0].reasons)
    # The runner-up is credited honestly: the missed specialty is named as a
    # gap, never silently dropped from the evidence.
    assert any("No Business English specialty" in reason for reason in ranked[1].reasons)


@pytest.mark.asyncio
async def test_a_same_shift_tutor_beats_a_night_shift_one(db_session, starter_package, arabic_learner, make_order):
    same_shift = await approved_tutor(
        db_session, email="t.day@example.com", full_name="Day Shift",
        timezone="Asia/Dubai", availability=[(1, "09:00", "13:00", "Asia/Dubai")],
    )
    night = await approved_tutor(
        db_session, email="t.night@example.com", full_name="Night Shift",
        timezone="Asia/Dubai", availability=[(1, "23:00", "23:59", "Asia/Dubai")],
    )
    order = await make_order(subject="General English")

    ranked = await rank_tutors_for_learner(db_session, arabic_learner, order)

    assert ranked[0].tutor.id == same_shift.id
    assert any("time zone" in reason.lower() for reason in ranked[0].reasons)


@pytest.mark.asyncio
async def test_the_lighter_load_wins_an_otherwise_tie(db_session, starter_package, learner_user, make_order):
    carried = await plain_student(db_session, "l.carried@example.com")
    # The busy tutor carries learners; the free one carries none. Everything
    # the two share (language, subject, zone) must not hide the load gap.
    busy = await approved_tutor(
        db_session, email="t.busy@example.com", full_name="Busy Tutor", learners=[carried],
    )
    free = await approved_tutor(db_session, email="t.free@example.com", full_name="Free Tutor")
    assert busy.id < free.id
    order = await make_order(subject="General English")

    ranked = await rank_tutors_for_learner(db_session, learner_user, order)

    assert ranked[0].tutor.id == free.id
    assert any("load" in reason.lower() for reason in ranked[0].reasons)


@pytest.mark.asyncio
async def test_an_unknown_learner_zone_is_said_not_guessed(db_session, starter_package, learner_user, make_order):
    learner_user.timezone = None
    await db_session.commit()
    await approved_tutor(db_session, email="t.any@example.com", full_name="Any", timezone="Asia/Tokyo")
    order = await make_order(subject="General English")

    ranked = await rank_tutors_for_learner(db_session, learner_user, order)

    assert any("unknown" in reason.lower() for reason in ranked[0].reasons)


@pytest.mark.asyncio
async def test_a_paid_order_writes_an_audit_of_who_and_why(db_session, starter_package, arabic_learner, make_order):
    from app.models.match_placement import MatchPlacement

    await approved_tutor(db_session, email="t.audit@example.com", full_name="Audit Tutor", languages=["Arabic"])
    order = await make_order(subject="General English", status=OrderStatus.PROCESSING)

    assert await match_paid_student(db_session, order) is True

    rows = (await db_session.execute(select(MatchPlacement))).scalars().all()
    assert len(rows) == 1
    placement = rows[0]
    assert placement.student_id == arabic_learner.id
    assert placement.source == "auto"
    assert placement.decided_by is None  # the engine acted, no human signed it
    assert placement.chosen_tutor_id == arabic_learner.tutor_id
    assert placement.score > 0
    assert any("Arabic" in reason for reason in placement.reasons)


@pytest.mark.asyncio
async def test_a_tutor_already_in_place_writes_no_new_audit(db_session, starter_package, learner_user, make_order):
    from app.models.match_placement import MatchPlacement

    existing = await approved_tutor(db_session, email="t.old@example.com", full_name="Old Tutor")
    learner_user.tutor_id = existing.id
    await db_session.commit()
    order = await make_order(status=OrderStatus.PROCESSING)

    assert await match_paid_student(db_session, order) is True

    assert (await db_session.execute(select(MatchPlacement))).scalars().all() == []


@pytest.mark.asyncio
async def test_an_admin_assignment_is_audited_too(db_session, admin_user, learner_user):
    from app.models.match_placement import MatchPlacement

    tutor = await approved_tutor(db_session, email="t.pick@example.com", full_name="Picked Tutor")
    async with make_client(db_session, admin_user) as client:
        response = await client.post(
            "/api/v1/admin/assign-student",
            json={"student_id": learner_user.id, "tutor_id": tutor.id},
        )
    assert response.status_code == 200, response.text
    placement = (await db_session.execute(select(MatchPlacement))).scalar_one()
    assert placement.source == "admin"
    assert placement.decided_by == admin_user.id


@pytest.mark.asyncio
async def test_the_queue_previews_the_best_candidate(db_session, admin_user, starter_package, make_order):
    await approved_tutor(db_session, email="t.q1@example.com", full_name="Q Plain")
    arabic = await approved_tutor(db_session, email="t.q2@example.com", full_name="Q Arabic", languages=["Arabic"])
    learner = await _learner_with_order(db_session, starter_package)
    order = await make_order(user_id=learner.id, status=OrderStatus.MATCHING_PENDING)

    async with make_client(db_session, admin_user) as client:
        response = await client.get("/api/v1/admin/matching-queue")
    assert response.status_code == 200, response.text
    rows = response.json()["queue"]
    assert len(rows) == 1
    assert rows[0]["order_id"] == order.id
    assert rows[0]["best_candidate"]["tutor_id"] == arabic.id
    assert rows[0]["best_candidate"]["reasons"]


@pytest.mark.asyncio
async def test_the_queue_says_so_when_nobody_qualifies(db_session, admin_user, starter_package, make_order):
    learner = await _learner_with_order(db_session, starter_package)
    await make_order(user_id=learner.id, status=OrderStatus.MATCHING_PENDING)

    async with make_client(db_session, admin_user) as client:
        response = await client.get("/api/v1/admin/matching-queue")
    assert response.status_code == 200, response.text
    rows = response.json()["queue"]
    assert len(rows) == 1
    assert rows[0]["best_candidate"] is None


async def _learner_with_order(db_session, starter_package):
    learner = User(
        email="queue.learner@example.com", hashed_password="x",
        full_name="Queue Learner", role=UserRole.STUDENT, is_active=True,
        # A language the runner-up does not speak, so the preview has a real
        # reason to rank on rather than a tie broken by id.
        native_language="Arabic",
    )
    db_session.add(learner)
    await db_session.commit()
    return learner
