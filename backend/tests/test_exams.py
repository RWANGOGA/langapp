"""
Tutor-authored exams (red-first).

The contract these tests pin down, in the order a real paper is lived:

  tutor writes a paper for one learner  ->  it appears on the learner's
  dashboard  ->  the learner sits it inside a server-frozen window  ->  the
  objective part is scored by the server  ->  the tutor marks the written
  answers  ->  release publishes the result, and optionally moves the CEFR
  level as a named human decision.

Three rules are load-bearing and get tested explicitly rather than assumed:
the answer key never reaches a learner payload; nothing about a result is
revealed before the tutor releases it; and a sitting that overruns its window
is graded on what was actually answered instead of being silently accepted.
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from tests.sqlite_fixtures import db_session, learner_user, tutor_user, other_tutor_user, make_client  # noqa: F401
from app.core.time import utc_now
from app.models.exam import Exam, ExamAttempt, AttemptStatus
from app.models.notification import Notification
from app.models.user import ProficiencyLevel, User

TUTOR_BASE = "/api/v1/tutor/exams"
LEARNER_BASE = "/api/v1/learner/exams"


def paper(learner_id: int, due_in_days: int = 3) -> dict:
    """A mixed paper: two objective questions (3 points) and one written (5)."""
    return {
        "learner_id": learner_id,
        "title": "Unit 4 - Past tenses",
        "instructions": "Answer every question in your own words.",
        "duration_minutes": 30,
        "due_at": to_utc(datetime.utcnow() + timedelta(days=due_in_days)),
        "shuffle_questions": False,
        "questions": [
            {
                "position": 0,
                "type": "multiple_choice",
                "prompt": "She ___ to school yesterday.",
                "points": 2,
                "options": ["go", "went", "goes"],
                "correct_index": 1,
            },
            {
                "position": 1,
                "type": "multiple_choice",
                "prompt": "Which one is plural?",
                "points": 1,
                "options": ["child", "children"],
                "correct_index": 1,
            },
            {
                "position": 2,
                "type": "written",
                "prompt": "Write two sentences about your weekend.",
                "points": 5,
            },
        ],
    }


def to_utc(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat() + "+00:00"


async def assign(db_session, learner, tutor):  # noqa: F811
    """The tutor must actually hold the learner - exams follow the placement."""
    learner.tutor_id = tutor.id
    await db_session.commit()
    await db_session.refresh(learner)


async def created_exam(client, learner_id, payload=None) -> int:
    body = payload if payload is not None else paper(learner_id)
    r = await client.post(TUTOR_BASE, json=body)
    assert r.status_code == 201, r.text
    return r.json()["exam_id"]


async def sit_and_submit(client, exam_id, answers) -> dict:
    await client.post(f"{LEARNER_BASE}/{exam_id}/start")
    for a in answers:
        r = await client.post(f"{LEARNER_BASE}/{exam_id}/answers", json=a)
        assert r.status_code == 200, r.text
    r = await client.post(f"{LEARNER_BASE}/{exam_id}/submit", json={})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_tutor_can_publish_a_paper_for_their_own_learner(
    db_session, tutor_user, learner_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(LEARNER_BASE)
        assert r.status_code == 200, r.text
        rows = r.json()["exams"]
    assert len(rows) == 1
    assert rows[0]["title"] == "Unit 4 - Past tenses"
    assert rows[0]["total_points"] == 8
    assert rows[0]["question_count"] == 3
    # Nothing started yet: the paper is simply available, on the clock it keeps.
    assert rows[0]["state"] == "available"


@pytest.mark.asyncio
async def test_a_tutor_cannot_assign_a_paper_to_another_tutors_learner(
    db_session, tutor_user, learner_user, other_tutor_user  # noqa: F811
):
    """Ownership is the placement, not a checkbox on the create form."""
    await assign(db_session, learner_user, other_tutor_user)
    async with make_client(db_session, tutor_user) as stranger:
        r = await stranger.post(TUTOR_BASE, json=paper(learner_user.id))
        assert r.status_code == 400, r.text

    # And the learner never sees a paper that was not theirs to receive.
    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(LEARNER_BASE)
        assert r.json()["exams"] == []


@pytest.mark.asyncio
async def test_a_tutor_cannot_read_another_tutors_exam(
    db_session, tutor_user, learner_user, other_tutor_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as owner:
        exam_id = await created_exam(owner, learner_user.id)

    async with make_client(db_session, other_tutor_user) as nosy:
        r = await nosy.get(f"{TUTOR_BASE}/{exam_id}")
        # 404, not 403: another tutor's paper is not confirmed to exist.
        assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_objective_answers_are_scored_by_the_server(
    db_session, tutor_user, learner_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        paper_rows = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in paper_rows["questions"]}
        result = await sit_and_submit(learner, exam_id, [
            # First right, second wrong, plus an ungraded written answer.
            {"question_id": q["She ___ to school yesterday."], "choice_index": 1},
            {"question_id": q["Which one is plural?"], "choice_index": 0},
            {"question_id": q["Write two sentences about your weekend."],
             "text": "I walked home and read half a novel."},
        ])

    # 2 for the correct MCQ, 0 for the wrong one, nothing yet for the essay.
    assert result["auto_score"] == 2
    assert result["total_points"] == 8
    assert result["status"] == "submitted"


@pytest.mark.asyncio
async def test_a_learner_payload_never_carries_the_answer_key(
    db_session, tutor_user, learner_user  # noqa: F401, F811
):
    """Asserted on the serialized text, not just the schema.

    A single model with an optional `correct_index` would let one careless call
    site ship the key while every type check stayed green.
    """
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = await learner.post(f"{LEARNER_BASE}/{exam_id}/start")
        assert started.status_code == 200, started.text
        assert "correct_index" not in started.text

        single = await learner.get(f"{LEARNER_BASE}/{exam_id}")
        assert single.status_code == 200, single.text
        assert "correct_index" not in single.text

        r = await learner.get(LEARNER_BASE)
        assert "correct_index" not in r.text


@pytest.mark.asyncio
async def test_start_is_resume_safe_and_the_window_stays_frozen(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """Two starts are one sitting; a reload cannot buy more time."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        first = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        second = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()

    assert first["attempt_id"] == second["attempt_id"]
    assert first["expires_at"] == second["expires_at"]

    rows = (await db_session.execute(select(ExamAttempt))).scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_submitting_after_the_window_yields_partial_credit_not_acceptance(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """An overrun attempt is graded on what was answered, and says so."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in started["questions"]}
        await learner.post(f"{LEARNER_BASE}/{exam_id}/answers", json={
            "question_id": q["She ___ to school yesterday."], "choice_index": 1,
        })

        # Drive the clock past the frozen deadline the way a real learner would
        # by simply not coming back.
        attempt = (
            await db_session.execute(
                select(ExamAttempt).where(ExamAttempt.id == started["attempt_id"])
            )
        ).scalar_one()
        attempt.expires_at = utc_now() - timedelta(minutes=1)
        await db_session.commit()

        r = await learner.post(f"{LEARNER_BASE}/{exam_id}/submit", json={})
        assert r.status_code == 200, r.text
        body = r.json()

    assert body["status"] == "expired"
    # The one answer actually given still counts; nothing else is invented.
    assert body["auto_score"] == 2


@pytest.mark.asyncio
async def test_a_result_stays_closed_until_the_tutor_releases_it(
    db_session, tutor_user, learner_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in started["questions"]}
        await sit_and_submit(learner, exam_id, [
            {"question_id": q["She ___ to school yesterday."], "choice_index": 1},
            {"question_id": q["Which one is plural?"], "choice_index": 1},
            {"question_id": q["Write two sentences about your weekend."],
             "text": "I slept late and cooked rice."},
        ])

        # Submitted is not released: the learner cannot see a score yet.
        r = await learner.get(f"{LEARNER_BASE}/{exam_id}/result")
        assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_release_is_refused_while_a_written_answer_is_unmarked(
    db_session, tutor_user, learner_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in started["questions"]}
        await sit_and_submit(learner, exam_id, [
            {"question_id": q["She ___ to school yesterday."], "choice_index": 1},
            {"question_id": q["Which one is plural?"], "choice_index": 1},
            {"question_id": q["Write two sentences about your weekend."],
             "text": "I slept late and cooked rice."},
        ])
        attempt_id = started["attempt_id"]

    async with make_client(db_session, tutor_user) as tutor:
        # Release without touching the essay: refused, honestly.
        r = await tutor.post(f"{TUTOR_BASE}/{exam_id}/attempts/{attempt_id}/release", json={})
        assert r.status_code == 409, r.text

        r = await tutor.post(
            f"{TUTOR_BASE}/{exam_id}/attempts/{attempt_id}/grade",
            json={"answers": [
                {"question_id": q["Write two sentences about your weekend."],
                 "awarded_points": 4, "feedback": "Good past tense; add a linking word."},
            ]},
        )
        assert r.status_code == 200, r.text

        r = await tutor.post(f"{TUTOR_BASE}/{exam_id}/attempts/{attempt_id}/release", json={})
        assert r.status_code == 200, r.text

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(f"{LEARNER_BASE}/{exam_id}/result")
        assert r.status_code == 200, r.text
        body = r.json()
    assert body["score"] == 7  # 3 objective + 4 written
    assert body["total_points"] == 8
    assert body["manual_score"] == 4
    assert any(a["feedback"] for a in body["answers"])


@pytest.mark.asyncio
async def test_releasing_with_a_level_change_is_attributed_to_the_tutor(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """CEFR advancement becomes evidence, with the decision and the old value kept."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in started["questions"]}
        await sit_and_submit(learner, exam_id, [
            {"question_id": q["She ___ to school yesterday."], "choice_index": 1},
            {"question_id": q["Which one is plural?"], "choice_index": 1},
            {"question_id": q["Write two sentences about your weekend."],
             "text": "I slept late and cooked rice."},
        ])
        attempt_id = started["attempt_id"]

    essay_id = q["Write two sentences about your weekend."]
    async with make_client(db_session, tutor_user) as tutor:
        await tutor.post(
            f"{TUTOR_BASE}/{exam_id}/attempts/{attempt_id}/grade",
            json={"answers": [{"question_id": essay_id, "awarded_points": 5}]},
        )
        r = await tutor.post(
            f"{TUTOR_BASE}/{exam_id}/attempts/{attempt_id}/release", json={"new_level": "B2"}
        )
        assert r.status_code == 200, r.text

    refreshed = (
        await db_session.execute(select(User).where(User.id == learner_user.id))
    ).scalar_one()
    assert refreshed.proficiency_level == ProficiencyLevel.B2

    attempt = (
        await db_session.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    ).scalar_one()
    assert attempt.level_before == "B1"
    assert attempt.level_after == "B2"
    assert attempt.released_by == tutor_user.id
    assert attempt.status == AttemptStatus.RELEASED


@pytest.mark.asyncio
async def test_questions_are_locked_once_a_sitting_has_begun(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """An answered paper cannot be quietly rewritten under the learner."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        await learner.post(f"{LEARNER_BASE}/{exam_id}/start")

    rewritten = paper(learner_user.id)
    rewritten["questions"] = [
        {
            "position": 0, "type": "multiple_choice", "prompt": "Replaced entirely?",
            "points": 10, "options": ["yes", "no"], "correct_index": 0,
        }
    ]
    async with make_client(db_session, tutor_user) as tutor:
        r = await tutor.patch(f"{TUTOR_BASE}/{exam_id}", json=rewritten)
        assert r.status_code == 409, r.text

        # Editing the instructions, which cannot move a score, still works.
        r = await tutor.patch(f"{TUTOR_BASE}/{exam_id}", json={"instructions": "Take your time."})
        assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_an_unstarted_paper_disappears_once_its_window_closes(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """A deadline passed with no sitting reads expired, never 'available'."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    # The window closes on its own; nobody had to be told.
    exam = (
        await db_session.execute(select(Exam).where(Exam.id == exam_id))
    ).scalar_one()
    exam.due_at = utc_now() - timedelta(minutes=1)
    await db_session.commit()

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get(LEARNER_BASE)
        rows = r.json()["exams"]
        assert rows[0]["state"] == "expired"

        # And it cannot be opened at all.
        r = await learner.post(f"{LEARNER_BASE}/{exam_id}/start")
        assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_the_learner_dashboard_counts_a_pending_paper(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """The dashboard band needs the number, not a second round trip."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        r = await learner.get("/api/v1/learner/dashboard")
        assert r.status_code == 200, r.text
        exams = r.json()["exams"]
    assert exams["pending"] == 1
    assert exams["dueAt"]


# ---------------------------------------------------------------- editing
#
# A deadline is the one field a tutor genuinely needs to move after publishing:
# "I was away that week, can I do it Monday?" is answered every term. These
# tests hold the edit to what it cannot touch - a clock a learner is already
# sitting by, a paper the tutor deliberately closed, and anybody else's paper.


async def deadline_of(db_session, exam_id) -> datetime:  # noqa: F811
    return (await db_session.execute(select(Exam.due_at).where(Exam.id == exam_id))).scalar_one()


@pytest.mark.asyncio
async def test_a_tutor_can_move_the_deadline_of_a_paper_they_published(
    db_session, tutor_user, learner_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id, paper(learner_user.id, due_in_days=1))
        before = await deadline_of(db_session, exam_id)

        moved = to_utc(datetime.utcnow() + timedelta(days=9))
        r = await tutor.patch(f"{TUTOR_BASE}/{exam_id}", json={"due_at": moved})
        assert r.status_code == 200, r.text
        after = await deadline_of(db_session, exam_id)

    assert after > before

    # The learner reads the new date, not the one they were first given.
    async with make_client(db_session, learner_user) as learner:
        rows = (await learner.get(LEARNER_BASE)).json()["exams"]
    assert rows[0]["due_at"] == after.replace(microsecond=0).isoformat() + "+00:00"

    # And they are told: a deadline that moves in silence is a deadline missed.
    kinds = (
        await db_session.execute(
            select(Notification.notification_type).where(
                Notification.recipient_id == learner_user.id
            )
        )
    ).scalars().all()
    assert "exam_deadline_changed" in kinds


@pytest.mark.asyncio
async def test_a_deadline_cannot_be_moved_into_the_past(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """A past date on an open paper would make it unopenable on save."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)
        before = await deadline_of(db_session, exam_id)

        r = await tutor.patch(
            f"{TUTOR_BASE}/{exam_id}",
            json={"due_at": to_utc(datetime.utcnow() - timedelta(hours=2))},
        )
        assert r.status_code == 400, r.text
        assert (await deadline_of(db_session, exam_id)) == before


@pytest.mark.asyncio
async def test_giving_a_lapsed_paper_a_future_deadline_puts_it_back(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """The window ran out with nobody in it, so the paper is not finished."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    exam = (await db_session.execute(select(Exam).where(Exam.id == exam_id))).scalar_one()
    exam.due_at = utc_now() - timedelta(minutes=5)
    await db_session.commit()

    async with make_client(db_session, learner_user) as learner:
        assert (await learner.get(LEARNER_BASE)).json()["exams"][0]["state"] == "expired"
        assert (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).status_code == 409

    async with make_client(db_session, tutor_user) as tutor:
        r = await tutor.patch(
            f"{TUTOR_BASE}/{exam_id}",
            json={"due_at": to_utc(datetime.utcnow() + timedelta(days=4))},
        )
        assert r.status_code == 200, r.text

    async with make_client(db_session, learner_user) as learner:
        rows = (await learner.get(LEARNER_BASE)).json()["exams"]
        assert rows[0]["state"] == "available"
        assert (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).status_code == 200


@pytest.mark.asyncio
async def test_a_paper_the_tutor_closed_stays_closed(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """Closing is a decision; editing the date is not an un-closing."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)
        assert (await tutor.post(f"{TUTOR_BASE}/{exam_id}/close", json={})).status_code == 200

        r = await tutor.patch(
            f"{TUTOR_BASE}/{exam_id}",
            json={"due_at": to_utc(datetime.utcnow() + timedelta(days=4))},
        )
        assert r.status_code == 200, r.text
        exam = (await db_session.execute(select(Exam).where(Exam.id == exam_id))).scalar_one()
        assert exam.status.value == "closed"

    async with make_client(db_session, learner_user) as learner:
        assert (await learner.get(LEARNER_BASE)).json()["exams"][0]["state"] == "expired"


@pytest.mark.asyncio
async def test_a_moved_time_limit_does_not_touch_a_sitting_in_progress(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """The window a learner started with is the window they are timed by."""
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        started = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()

    async with make_client(db_session, tutor_user) as tutor:
        r = await tutor.patch(
            f"{TUTOR_BASE}/{exam_id}",
            json={
                "duration_minutes": 90,
                "due_at": to_utc(datetime.utcnow() + timedelta(days=12)),
            },
        )
        assert r.status_code == 200, r.text

    async with make_client(db_session, learner_user) as learner:
        again = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
    assert again["expires_at"] == started["expires_at"]
    assert again["duration_minutes"] == 90


@pytest.mark.asyncio
async def test_only_the_tutor_who_wrote_the_paper_can_edit_it(
    db_session, tutor_user, learner_user, other_tutor_user  # noqa: F811
):
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    new_due = to_utc(datetime.utcnow() + timedelta(days=6))
    async with make_client(db_session, other_tutor_user) as nosy:
        r = await nosy.patch(f"{TUTOR_BASE}/{exam_id}", json={"due_at": new_due})
        # 404: another tutor's paper is not confirmed to exist, and not edited.
        assert r.status_code == 404, r.text
    async with make_client(db_session, learner_user) as learner:
        r = await learner.patch(f"{TUTOR_BASE}/{exam_id}", json={"due_at": new_due})
        assert r.status_code == 403, r.text

    assert await deadline_of(db_session, exam_id) < utc_now() + timedelta(days=3)


@pytest.mark.asyncio
async def test_the_tutor_record_carries_the_marking_clocks(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """The edit form is seeded from the record, so the record must hold it.

    A shuffle switch cannot be shown as a toggle unless the paper says how it
    was set, and the instructions cannot be corrected unless the tutor can read
    them back. Both are the tutor's own words.
    """
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        drafted = paper(learner_user.id)
        drafted["shuffle_questions"] = True
        exam_id = await created_exam(tutor, learner_user.id, drafted)
        item = next(r for r in (await tutor.get(TUTOR_BASE)).json() if r["id"] == exam_id)
    assert item["shuffle_questions"] is True
    assert item["instructions"] == "Answer every question in your own words."

    # And the switch is editable while nobody has sat it.
    async with make_client(db_session, tutor_user) as tutor:
        r = await tutor.patch(f"{TUTOR_BASE}/{exam_id}", json={"shuffle_questions": False})
        assert r.status_code == 200, r.text
        item = next(r for r in (await tutor.get(TUTOR_BASE)).json() if r["id"] == exam_id)
    assert item["shuffle_questions"] is False


@pytest.mark.asyncio
async def test_the_tutor_record_holds_the_mark_before_the_learner_sees_it(
    db_session, tutor_user, learner_user  # noqa: F811
):
    """The tutor's own record is not a secret from the tutor.

    The objective part is scored by the server at submission, so a submitted
    paper already has a number to show the person who set it - while the
    learner's result stays refused until that number is released.
    """
    await assign(db_session, learner_user, tutor_user)
    async with make_client(db_session, tutor_user) as tutor:
        exam_id = await created_exam(tutor, learner_user.id)

    async with make_client(db_session, learner_user) as learner:
        rows = (await learner.post(f"{LEARNER_BASE}/{exam_id}/start")).json()
        q = {row["prompt"]: row["id"] for row in rows["questions"]}
        await sit_and_submit(learner, exam_id, [
            {"question_id": q["She ___ to school yesterday."], "choice_index": 1},
            {"question_id": q["Which one is plural?"], "choice_index": 1},
            {"question_id": q["Write two sentences about your weekend."],
             "text": "I slept late and cooked rice."},
        ])
        assert (await learner.get(f"{LEARNER_BASE}/{exam_id}/result")).status_code == 409

    async with make_client(db_session, tutor_user) as tutor:
        item = next(
            row for row in (await tutor.get(TUTOR_BASE)).json() if row["id"] == exam_id
        )
    attempt = item["attempt"]
    assert attempt["status"] == "submitted"
    assert attempt["auto_score"] == 3
    assert attempt["total_points"] == 8
    assert attempt["submitted_at"]
    assert attempt["released_at"] is None
