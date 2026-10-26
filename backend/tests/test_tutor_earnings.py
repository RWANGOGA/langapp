"""What a tutor is owed: $10 per 60 minutes of teaching, pro-rated by length.

The rate is a school policy, not a per-class field, so the arithmetic lives in
one place and every lesson is priced from its own duration. These tests pin
that arithmetic, the exclusion of anything that was not taught, and the fact
that one tutor can never see another tutor's lessons.
"""
from datetime import datetime, timedelta

import pytest

from app.models.user import Class, ClassStatus, User, UserRole

from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    client,
    learner_client,
)

EARNINGS = "/api/v1/tutor/earnings"


def _completed(tutor_id: int, learner_id: int, minutes: int, days_ago: int = 1, status=ClassStatus.COMPLETED):
    return Class(
        learner_id=learner_id,
        tutor_id=tutor_id,
        title=f"{minutes} minute lesson",
        scheduled_at=datetime.utcnow() - timedelta(days=days_ago),
        duration_minutes=minutes,
        status=status,
    )


@pytest.mark.asyncio
async def test_a_one_hour_lesson_is_ten_dollars(client, db_session, tutor_user, learner_user):
    db_session.add(Class(
        learner_id=learner_user.id,
        tutor_id=tutor_user.id,
        title="Unit 7 - Conversation Practice",
        scheduled_at=datetime.utcnow() - timedelta(days=2),
        duration_minutes=60,
        status=ClassStatus.COMPLETED,
    ))
    await db_session.commit()

    response = await client.get(EARNINGS)

    assert response.status_code == 200
    body = response.json()
    assert body["rate"] == {"amount_cents": 1000, "currency": "USD", "per_minutes": 60}
    assert len(body["lessons"]) == 1
    assert body["lessons"][0]["amount_cents"] == 1000
    assert body["lessons"][0]["learner"] == "Test Learner"
    assert body["lessons"][0]["topic"] == "Unit 7 - Conversation Practice"


@pytest.mark.asyncio
async def test_a_ninety_minute_lesson_pays_one_and_a_half_hours(client, db_session, tutor_user, learner_user):
    db_session.add(_completed(tutor_user.id, learner_user.id, 90))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["lessons"][0]["amount_cents"] == 1500
    assert body["totals"]["all_time_cents"] == 1500


@pytest.mark.asyncio
async def test_a_half_hour_lesson_pays_half(client, db_session, tutor_user, learner_user):
    db_session.add(_completed(tutor_user.id, learner_user.id, 30))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["lessons"][0]["amount_cents"] == 500


@pytest.mark.asyncio
async def test_an_odd_length_rounds_to_the_nearest_cent(client, db_session, tutor_user, learner_user):
    # 1000 * 45 / 60 = 750 exactly; 1000 * 20 / 60 = 333.33 -> 333.
    db_session.add(_completed(tutor_user.id, learner_user.id, 45))
    db_session.add(_completed(tutor_user.id, learner_user.id, 20, days_ago=3))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert sorted(lesson["amount_cents"] for lesson in body["lessons"]) == [333, 750]


@pytest.mark.asyncio
async def test_lessons_that_were_not_taught_are_not_paid(client, db_session, tutor_user, learner_user):
    db_session.add(_completed(tutor_user.id, learner_user.id, 60, status=ClassStatus.SCHEDULED))
    db_session.add(_completed(tutor_user.id, learner_user.id, 60, status=ClassStatus.CANCELLED))
    db_session.add(_completed(tutor_user.id, learner_user.id, 60, status=ClassStatus.NO_SHOW))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["lessons"] == []
    assert body["totals"]["all_time_cents"] == 0


@pytest.mark.asyncio
async def test_another_tutors_lessons_never_appear(client, db_session, tutor_user, learner_user):
    rival = User(
        email="rival@example.com",
        hashed_password="x",
        full_name="Rival Tutor",
        role=UserRole.TUTOR,
        is_active=True,
    )
    db_session.add(rival)
    await db_session.commit()
    await db_session.refresh(rival)
    db_session.add(_completed(rival.id, learner_user.id, 60))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["lessons"] == []
    assert body["totals"]["all_time_cents"] == 0


@pytest.mark.asyncio
async def test_totals_add_up_and_count_minutes(client, db_session, tutor_user, learner_user):
    db_session.add(_completed(tutor_user.id, learner_user.id, 60))
    db_session.add(_completed(tutor_user.id, learner_user.id, 30, days_ago=2))
    db_session.add(_completed(tutor_user.id, learner_user.id, 90, days_ago=3))
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["totals"]["all_time_cents"] == 1000 + 500 + 1500
    assert body["totals"]["all_time_lessons"] == 3
    assert body["totals"]["all_time_minutes"] == 180


@pytest.mark.asyncio
async def test_the_statement_is_grouped_by_month_newest_first(client, db_session, tutor_user, learner_user):
    now = datetime.utcnow()
    first_of_this_month = now.replace(day=1, hour=12, minute=0, second=0, microsecond=0)
    current = _completed(tutor_user.id, learner_user.id, 60)
    current.scheduled_at = first_of_this_month
    older = _completed(tutor_user.id, learner_user.id, 60, days_ago=40)
    db_session.add_all([current, older])
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    months = [row["month"] for row in body["months"]]
    assert months == sorted(months, reverse=True)
    assert months[0] == now.strftime("%Y-%m")
    assert len(months) == 2


@pytest.mark.asyncio
async def test_this_month_and_last_month_are_reported_separately(client, db_session, tutor_user, learner_user):
    now = datetime.utcnow()
    first_of_this_month = now.replace(day=1, hour=12, minute=0, second=0, microsecond=0)
    last_month = first_of_this_month - timedelta(days=1)

    in_this_month = _completed(tutor_user.id, learner_user.id, 60)
    in_this_month.scheduled_at = first_of_this_month
    in_last_month = _completed(tutor_user.id, learner_user.id, 30)
    in_last_month.scheduled_at = last_month
    db_session.add_all([in_this_month, in_last_month])
    await db_session.commit()

    body = (await client.get(EARNINGS)).json()

    assert body["totals"]["this_month_cents"] == 1000
    assert body["totals"]["last_month_cents"] == 500


@pytest.mark.asyncio
async def test_a_tutor_with_no_lessons_gets_zeroes_not_an_error(client):
    response = await client.get(EARNINGS)

    assert response.status_code == 200
    body = response.json()
    assert body["lessons"] == []
    assert body["months"] == []
    assert body["totals"]["all_time_cents"] == 0
    assert body["totals"]["all_time_lessons"] == 0


@pytest.mark.asyncio
async def test_a_student_cannot_read_tutor_earnings(learner_client):
    response = await learner_client.get(EARNINGS)

    assert response.status_code == 403
