"""Tutor-authored exams: the paper, the sitting, the marking, the release.

Two actors, one lifecycle. The tutor writes a paper for a learner they hold and
publishes it; the learner sits it inside a window the server froze at start;
the tutor marks what a machine cannot (the writing) and releases, which is the
only moment any result becomes visible.

Three invariants the rest of the module exists to protect:

1. **The key never crosses.** Every learner payload is built through
   `QuestionForLearner`, a class with no `correct_index` field at all, so a
   future call site cannot leak it by forgetting to pop a key.
2. **The clock is the server's.** `expires_at` is written once, at start. Reads
   re-derive state from `utc_now()`, and an attempt found past its window is
   closed and scored right there, so an abandoned paper cannot sit open.
3. **A score is never invented.** Objective points come from the stored key;
   written points come only from the tutor, and release refuses until every
   written question has been marked - including one the learner left blank.
"""
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.time import utc_now, to_utc_iso
from app.db.session import get_db
from app.api.auth import get_current_user
from app.models.exam import (
    AttemptStatus, Exam, ExamAnswer, ExamAttempt, ExamStatus,
    ExamQuestion, QuestionType,
)
from app.models.user import ProficiencyLevel, User, UserRole
from app.schemas.exam import (
    AnswerForTutor, AnswerUpsertRequest, AttemptForTutor, ExamActionResult,
    ExamCreateRequest, ExamDetailForTutor, ExamListItemForTutor,
    ExamSubmitResult, ExamSummaryForLearner, ExamUpdateRequest, GradeRequest,
    LearnerAnswerDetail, PaperForLearner, QuestionForLearner, QuestionForTutor,
    ReleaseRequest, ResultForLearner,
)
from app.services.notifications import notify_user

router = APIRouter()


class ExamListForLearner(BaseModel):
    exams: list[ExamSummaryForLearner]


# ---------------------------------------------------------------- helpers


async def _require_tutor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can author exams",
        )
    return current_user


async def _require_learner(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only learners can sit exams",
        )
    return current_user


def _as_naive_utc(dt: datetime) -> datetime:
    """Columns are naive UTC; an incoming offset is folded onto that clock."""
    if dt.tzinfo is None:
        return dt.replace(microsecond=0)
    return dt.astimezone(timezone.utc).replace(tzinfo=None, microsecond=0)


def _seconds_ahead(target: datetime, now: datetime) -> int:
    return max(0, int((target - now).total_seconds()))


def _questions_of(exam: Exam) -> list[ExamQuestion]:
    return sorted(exam.questions, key=lambda q: q.position)


def _total_points(questions: list[ExamQuestion]) -> int:
    return sum(q.points for q in questions)


async def _get_owned_exam(exam_id: int, tutor: User, db: AsyncSession) -> Exam:
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.questions),
            # Loaded with the paper because every tutor-facing row shows whose
            # paper this is; left lazy it would fire on a read inside a response
            # builder, which cannot await.
            selectinload(Exam.learner),
            selectinload(Exam.attempts).selectinload(ExamAttempt.answers),
        )
        .where(Exam.id == exam_id, Exam.tutor_id == tutor.id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        # 404, not 403: another tutor's paper is not confirmed to exist.
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


async def _get_exam_for_learner(
    exam_id: int, learner: User, db: AsyncSession
) -> Exam:
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.questions),
            selectinload(Exam.attempts).selectinload(ExamAttempt.answers),
        )
        .where(Exam.id == exam_id, Exam.learner_id == learner.id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _attempt_of(exam: Exam) -> ExamAttempt | None:
    """One learner, one sitting - the unique key makes this at most a row."""
    return exam.attempts[0] if exam.attempts else None


def _answer_map(attempt: ExamAttempt | None) -> dict[int, ExamAnswer]:
    if not attempt:
        return {}
    return {a.question_id: a for a in attempt.answers}


async def _close_if_overdue(
    exam: Exam, attempt: ExamAttempt | None, db: AsyncSession
) -> ExamAttempt | None:
    """Transition a stale open sitting and score what was actually answered.

    Called on reads, so a learner who starts a paper and never comes back ends
    up `expired` with the marks their few answers earned, rather than leaving
    an attempt open forever and holding the tutor's list hostage.
    """
    if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
        return attempt

    now = utc_now()
    if now <= attempt.expires_at and now <= exam.due_at:
        return attempt

    _score_objective(exam, attempt)
    attempt.status = AttemptStatus.EXPIRED
    attempt.submitted_at = now
    attempt.total_points = _total_points(_questions_of(exam))
    await db.commit()
    await db.refresh(attempt)
    return attempt


def _score_objective(exam: Exam, attempt: ExamAttempt) -> int:
    """Award every objective answer against the stored key, server-side.

    The learner's submission never carries a mark. A wrong choice scores zero
    and an unanswered question contributes nothing; neither is a judgement,
    both are arithmetic on the key the tutor wrote.
    """
    answers = _answer_map(attempt)
    auto = 0
    for q in _questions_of(exam):
        if q.type != QuestionType.MULTIPLE_CHOICE:
            continue
        ans = answers.get(q.id)
        if ans is None:
            continue
        if ans.choice_index is not None and ans.choice_index == q.correct_index:
            ans.awarded_points = q.points
            auto += q.points
        else:
            ans.awarded_points = 0
    attempt.auto_score = auto
    return auto


def _manual_total(exam: Exam, attempt: ExamAttempt) -> int:
    answers = _answer_map(attempt)
    return sum(
        answers[q.id].awarded_points or 0
        for q in _questions_of(exam)
        if q.type == QuestionType.WRITTEN and q.id in answers
    )


def _exam_state(exam: Exam, attempt: ExamAttempt | None) -> str:
    if attempt:
        return attempt.status.value
    now = utc_now()
    if exam.status == ExamStatus.CLOSED or now > exam.due_at:
        return "expired"
    return "available"


def is_pending_for_learner(exam: Exam, attempt: ExamAttempt | None, now: datetime) -> bool:
    """Whether the learner still owes this paper an answer.

    The dashboard band counts on this and the exam list reads its state from
    the same two clocks, so the two surfaces cannot disagree about whether
    something is outstanding: a closed window or a sitting past its frozen
    deadline is finished, whatever the status column has not yet been told.
    """
    if attempt is None:
        return exam.status == ExamStatus.PUBLISHED and exam.due_at > now
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return False
    return attempt.expires_at > now and exam.due_at > now


def _summary(exam: Exam, attempt: ExamAttempt | None) -> ExamSummaryForLearner:
    questions = _questions_of(exam)
    now = utc_now()
    if attempt and attempt.status == AttemptStatus.IN_PROGRESS:
        seconds = _seconds_ahead(attempt.expires_at, now)
    else:
        seconds = _seconds_ahead(exam.due_at, now)
    return ExamSummaryForLearner(
        id=exam.id,
        title=exam.title,
        instructions=exam.instructions,
        status=exam.status,
        question_count=len(questions),
        total_points=_total_points(questions),
        duration_minutes=exam.duration_minutes,
        due_at=to_utc_iso(exam.due_at),
        state=_exam_state(exam, attempt),
        seconds_left=seconds,
    )


def _paper_questions(exam: Exam, attempt: ExamAttempt | None) -> list[ExamQuestion]:
    """Shuffle order per sitting, not per read.

    Seeding on the attempt id means a reload cannot reshuffle the paper under
    someone mid-answer, while still keeping two learners off an identical run
    of positions when a tutor reuses a paper.
    """
    questions = _questions_of(exam)
    if exam.shuffle_questions and attempt:
        ordered = list(questions)
        random.Random(attempt.id).shuffle(ordered)
        return ordered
    return questions


def _attempt_for_tutor(attempt: ExamAttempt, exam: Exam) -> AttemptForTutor:
    by_question = {q.id: q for q in exam.questions}
    return AttemptForTutor(
        id=attempt.id,
        learner_id=attempt.learner_id,
        status=attempt.status,
        started_at=to_utc_iso(attempt.started_at),
        expires_at=to_utc_iso(attempt.expires_at),
        submitted_at=to_utc_iso(attempt.submitted_at) if attempt.submitted_at else None,
        auto_score=attempt.auto_score,
        manual_score=attempt.manual_score,
        total_points=attempt.total_points,
        level_before=attempt.level_before,
        level_after=attempt.level_after,
        released_at=to_utc_iso(attempt.released_at) if attempt.released_at else None,
        answers=[
            AnswerForTutor(
                id=a.id,
                question_id=a.question_id,
                choice_index=a.choice_index,
                text=a.text,
                awarded_points=a.awarded_points,
                feedback=a.feedback,
                correct=(
                    a.choice_index == by_question[a.question_id].correct_index
                    if a.choice_index is not None and a.question_id in by_question
                    else None
                ),
            )
            for a in attempt.answers
        ],
    )


def _item_for_tutor(exam: Exam) -> ExamListItemForTutor:
    questions = _questions_of(exam)
    attempt = _attempt_of(exam)
    return ExamListItemForTutor(
        id=exam.id,
        title=exam.title,
        learner_id=exam.learner_id,
        # A learner's name is data the tutor already sees in their roster; it
        # belongs on the paper list so a tutor with many learners knows whose
        # marking is waiting.
        learner_name=exam.learner.full_name if exam.learner else "Unknown",
        status=exam.status,
        question_count=len(questions),
        total_points=_total_points(questions),
        duration_minutes=exam.duration_minutes,
        due_at=to_utc_iso(exam.due_at),
        created_at=to_utc_iso(exam.created_at),
        attempt=_attempt_for_tutor(attempt, exam) if attempt else None,
    )


# ---------------------------------------------------------------- tutor side


@router.post(
    "/tutor/exams",
    response_model=ExamActionResult,
    status_code=status.HTTP_201_CREATED,
)
async def create_exam(
    payload: ExamCreateRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Write a paper and publish it to one learner in a single action.

    There is no draft state: publishing is the create call, so nothing
    half-written can exist somewhere a learner might look at it.
    """
    learner = (
        await db.execute(select(User).where(User.id == payload.learner_id))
    ).scalar_one_or_none()
    if not learner or learner.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Learner not found")
    # The right to set an exam follows the placement, not the tutor role: a
    # tutor writing for someone else's learner is refused, not silently filed.
    if learner.tutor_id != tutor.id:
        raise HTTPException(
            status_code=400,
            detail="This learner is not assigned to you",
        )

    due_at = _as_naive_utc(payload.due_at)
    if due_at <= utc_now():
        raise HTTPException(
            status_code=400,
            detail="The deadline must be in the future",
        )

    exam = Exam(
        tutor_id=tutor.id,
        learner_id=learner.id,
        title=payload.title.strip(),
        instructions=(payload.instructions or None),
        duration_minutes=payload.duration_minutes,
        due_at=due_at,
        shuffle_questions=payload.shuffle_questions,
        status=ExamStatus.PUBLISHED,
    )
    for item in payload.questions:
        exam.questions.append(
            ExamQuestion(
                position=item.position,
                type=item.type,
                prompt=item.prompt.strip(),
                points=item.points,
                options=item.options,
                correct_index=item.correct_index,
            )
        )
    db.add(exam)

    await notify_user(
        db,
        learner.id,
        "exam_assigned",
        f"New exam from your tutor: {exam.title}",
        f"{tutor.full_name} set a paper for you. Open your dashboard to read "
        f"the instructions and start it before the deadline.",
        link="/dashboard/exams",
    )

    await db.commit()
    await db.refresh(exam)
    return ExamActionResult(
        exam_id=exam.id,
        status=exam.status.value,
        updated_at=to_utc_iso(exam.updated_at or utc_now()),
    )


@router.get("/tutor/exams", response_model=list[ExamListItemForTutor])
async def list_tutor_exams(
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(Exam)
            .options(
                selectinload(Exam.questions),
                selectinload(Exam.learner),
                selectinload(Exam.attempts).selectinload(ExamAttempt.answers),
            )
            .where(Exam.tutor_id == tutor.id)
            .order_by(Exam.created_at.desc())
        )
    ).scalars().all()

    for exam in rows:
        await _close_if_overdue(exam, _attempt_of(exam), db)

    return [_item_for_tutor(exam) for exam in rows]


@router.get("/tutor/exams/{exam_id}", response_model=ExamDetailForTutor)
async def get_tutor_exam(
    exam_id: int,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    exam = await _get_owned_exam(exam_id, tutor, db)
    attempt = await _close_if_overdue(exam, _attempt_of(exam), db)

    item = _item_for_tutor(exam)
    item.attempt = _attempt_for_tutor(attempt, exam) if attempt else None
    return ExamDetailForTutor(
        exam=item,
        # The tutor always sees the key - it is what they wrote.
        questions=[
            QuestionForTutor(
                id=q.id, position=q.position, type=q.type, prompt=q.prompt,
                points=q.points, options=q.options, correct_index=q.correct_index,
            )
            for q in _questions_of(exam)
        ],
    )


@router.patch("/tutor/exams/{exam_id}", response_model=ExamActionResult)
async def update_exam(
    exam_id: int,
    payload: ExamUpdateRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Edit a paper. The questions only while nobody has sat it yet."""
    exam = await _get_owned_exam(exam_id, tutor, db)

    if payload.questions is not None:
        if exam.attempts:
            # A learner is answering *these* questions. Replacing them now
            # would move the ground under a sitting, and re-mark answers
            # against a key that did not exist when they were written.
            raise HTTPException(
                status_code=409,
                detail=(
                    "Questions cannot change once a learner has started. "
                    "Close this paper and set a new one instead."
                ),
            )
        exam.questions.clear()
        for item in payload.questions:
            exam.questions.append(
                ExamQuestion(
                    position=item.position,
                    type=item.type,
                    prompt=item.prompt.strip(),
                    points=item.points,
                    options=item.options,
                    correct_index=item.correct_index,
                )
            )

    if payload.title is not None:
        exam.title = payload.title.strip()
    if payload.instructions is not None:
        exam.instructions = payload.instructions or None
    if payload.duration_minutes is not None:
        exam.duration_minutes = payload.duration_minutes
    if payload.due_at is not None:
        exam.due_at = _as_naive_utc(payload.due_at)
    if payload.shuffle_questions is not None:
        exam.shuffle_questions = payload.shuffle_questions

    await db.commit()
    await db.refresh(exam)
    return ExamActionResult(
        exam_id=exam.id,
        status=exam.status.value,
        updated_at=to_utc_iso(exam.updated_at or utc_now()),
    )


@router.post("/tutor/exams/{exam_id}/close", response_model=ExamActionResult)
async def close_exam(
    exam_id: int,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """End the window early. An attempt already under way keeps its own clock."""
    exam = await _get_owned_exam(exam_id, tutor, db)
    exam.status = ExamStatus.CLOSED
    await db.commit()
    await db.refresh(exam)
    return ExamActionResult(
        exam_id=exam.id,
        status=exam.status.value,
        updated_at=to_utc_iso(exam.updated_at or utc_now()),
    )


@router.post(
    "/tutor/exams/{exam_id}/attempts/{attempt_id}/grade", response_model=ExamActionResult
)
async def grade_attempt(
    exam_id: int,
    attempt_id: int,
    payload: GradeRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Award points and comments per question - the human half of marking.

    A blank written answer gets a row when the tutor marks it zero: "they
    wrote nothing" is a decision, and it should read like one.
    """
    exam = await _get_owned_exam(exam_id, tutor, db)
    attempt = next((a for a in exam.attempts if a.id == attempt_id), None)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=409,
            detail="Cannot mark a sitting that is still open",
        )
    if attempt.status == AttemptStatus.RELEASED:
        raise HTTPException(
            status_code=409,
            detail="This result is already released",
        )

    by_question = {q.id: q for q in exam.questions}
    answers = _answer_map(attempt)
    for entry in payload.answers:
        q = by_question.get(entry.question_id)
        # Marking a question that is not on this paper is a mistake worth
        # failing loudly on, not a row to file somewhere.
        if not q:
            raise HTTPException(
                status_code=400,
                detail=f"Question {entry.question_id} is not on this paper",
            )
        if entry.awarded_points > q.points:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot award more than {q.points} points on this question",
            )
        ans = answers.get(q.id)
        if ans is None:
            # Held through the attempt rather than `db.add` alone: the total is
            # recomputed from `attempt.answers` below, and a detached-by-FK row
            # is invisible to that sum until it is flushed.
            ans = ExamAnswer(attempt_id=attempt.id, question_id=q.id)
            attempt.answers.append(ans)
            answers[q.id] = ans
        ans.awarded_points = entry.awarded_points
        ans.feedback = entry.feedback or None

    attempt.manual_score = _manual_total(exam, attempt)
    await db.commit()
    await db.refresh(attempt)
    return ExamActionResult(
        exam_id=exam.id,
        attempt_id=attempt.id,
        status=attempt.status.value,
        updated_at=to_utc_iso(attempt.updated_at or utc_now()),
    )


@router.post(
    "/tutor/exams/{exam_id}/attempts/{attempt_id}/release", response_model=ExamActionResult
)
async def release_attempt(
    exam_id: int,
    attempt_id: int,
    payload: ReleaseRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Publish a marked sitting to the learner - the only door to the result.

    Nothing reaches the learner before this call, and nothing reaches them
    partially after it: score, per-question marks and comments all appear at
    once, which is why the marking has to be finished first.
    """
    exam = await _get_owned_exam(exam_id, tutor, db)
    attempt = next((a for a in exam.attempts if a.id == attempt_id), None)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == AttemptStatus.RELEASED:
        raise HTTPException(status_code=409, detail="Already released")
    if attempt.status == AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=409,
            detail="The learner has not finished this sitting yet",
        )

    answers = _answer_map(attempt)
    unmarked = [
        q for q in _questions_of(exam)
        if q.type == QuestionType.WRITTEN and (
            q.id not in answers or answers[q.id].awarded_points is None
        )
    ]
    if unmarked:
        raise HTTPException(
            status_code=409,
            detail=(
                f"{len(unmarked)} written answer(s) still need marks. "
                "A blank answer should be marked zero, not left open."
            ),
        )

    attempt.auto_score = attempt.auto_score or _score_objective(exam, attempt)
    attempt.manual_score = _manual_total(exam, attempt)
    attempt.total_points = _total_points(_questions_of(exam))

    # A CEFR change here is the roadmap made real: level advancement stops
    # being a guess and becomes a decision recorded with the exam that
    # justified it, the level it replaced, and the tutor who signed it.
    if payload.new_level:
        learner = (
            await db.execute(select(User).where(User.id == exam.learner_id))
        ).scalar_one()
        attempt.level_before = (
            learner.proficiency_level.value if learner.proficiency_level else None
        )
        attempt.level_after = payload.new_level
        learner.proficiency_level = ProficiencyLevel(payload.new_level)

    attempt.status = AttemptStatus.RELEASED
    attempt.released_at = utc_now()
    attempt.released_by = tutor.id

    score = (attempt.auto_score or 0) + (attempt.manual_score or 0)
    await notify_user(
        db,
        exam.learner_id,
        "exam_released",
        f"Your exam result is ready: {exam.title}",
        f"{tutor.full_name} marked your paper and published the result - "
        f"{score} of {attempt.total_points} points, with comments on each answer.",
        link=f"/dashboard/exams/{exam.id}/result",
    )

    await db.commit()
    await db.refresh(attempt)
    return ExamActionResult(
        exam_id=exam.id,
        attempt_id=attempt.id,
        status=attempt.status.value,
        updated_at=to_utc_iso(attempt.released_at),
    )


@router.post(
    "/tutor/exams/{exam_id}/attempts/{attempt_id}/reopen", response_model=ExamActionResult
)
async def reopen_attempt(
    exam_id: int,
    attempt_id: int,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Let the learner sit it again. A deliberate, visible tutor decision."""
    exam = await _get_owned_exam(exam_id, tutor, db)
    attempt = next((a for a in exam.attempts if a.id == attempt_id), None)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Wipe the sitting rather than keep two: the unique key holds one attempt
    # per person, and a retake means starting over, not adding a layer.
    attempt.answers.clear()
    attempt.status = AttemptStatus.IN_PROGRESS
    attempt.started_at = utc_now()
    attempt.expires_at = attempt.started_at + timedelta(minutes=exam.duration_minutes)
    attempt.submitted_at = None
    attempt.auto_score = None
    attempt.manual_score = None
    attempt.total_points = None

    if exam.status == ExamStatus.CLOSED:
        exam.status = ExamStatus.PUBLISHED
    # A reopened paper whose old deadline has gone needs a new window, or the
    # learner returns to a paper that expired while they were reading this.
    if exam.due_at <= utc_now():
        exam.due_at = utc_now() + timedelta(minutes=exam.duration_minutes)

    await notify_user(
        db,
        exam.learner_id,
        "exam_reopened",
        f"Your tutor reopened: {exam.title}",
        f"{tutor.full_name} cleared your previous attempt so you can sit the "
        f"paper again.",
        link="/dashboard/exams",
    )

    await db.commit()
    await db.refresh(exam)
    return ExamActionResult(
        exam_id=exam.id,
        attempt_id=attempt.id,
        status=attempt.status.value,
        updated_at=to_utc_iso(exam.updated_at or utc_now()),
    )


# ---------------------------------------------------------------- learner side


@router.get("/learner/exams", response_model=ExamListForLearner)
async def list_learner_exams(
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(Exam)
            .options(
                selectinload(Exam.questions),
                selectinload(Exam.attempts).selectinload(ExamAttempt.answers),
            )
            .where(Exam.learner_id == learner.id)
            .order_by(Exam.due_at.asc())
        )
    ).scalars().all()

    out = []
    for exam in rows:
        attempt = await _close_if_overdue(exam, _attempt_of(exam), db)
        out.append(_summary(exam, attempt))
    return ExamListForLearner(exams=out)


@router.get("/learner/exams/{exam_id}", response_model=PaperForLearner)
async def read_learner_exam(
    exam_id: int,
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    """Describe a paper without opening a sitting, so a dashboard link is safe."""
    exam = await _get_exam_for_learner(exam_id, learner, db)
    attempt = await _close_if_overdue(exam, _attempt_of(exam), db)

    # Questions only once a sitting exists: showing the paper before the clock
    # starts would hand out the prompt list with no window attached.
    questions = (
        [
            QuestionForLearner(
                id=q.id, position=q.position, type=q.type, prompt=q.prompt,
                points=q.points, options=q.options,
            )
            for q in _paper_questions(exam, attempt)
        ]
        if attempt
        else []
    )
    summary = _summary(exam, attempt)
    return PaperForLearner(
        exam_id=exam.id,
        attempt_id=attempt.id if attempt else None,
        title=exam.title,
        instructions=exam.instructions,
        state=summary.state,
        status=attempt.status if attempt else None,
        expires_at=to_utc_iso(attempt.expires_at) if attempt else None,
        due_at=summary.due_at,
        seconds_left=summary.seconds_left,
        question_count=summary.question_count,
        total_points=summary.total_points,
        duration_minutes=summary.duration_minutes,
        questions=questions,
    )


@router.post("/learner/exams/{exam_id}/start", response_model=PaperForLearner)
async def start_exam(
    exam_id: int,
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    """Open a sitting, or hand back the one already open.

    Calling this twice must not mint a second attempt or extend the clock, so a
    refresh, a dropped connection or a second tab all land on the same frozen
    deadline.
    """
    exam = await _get_exam_for_learner(exam_id, learner, db)
    attempt = await _close_if_overdue(exam, _attempt_of(exam), db)
    now = utc_now()

    if attempt is None:
        if exam.status == ExamStatus.CLOSED:
            raise HTTPException(
                status_code=409,
                detail="Your tutor closed this paper",
            )
        if now > exam.due_at:
            raise HTTPException(
                status_code=409,
                detail="The deadline for this paper has passed",
            )
        attempt = ExamAttempt(
            exam_id=exam.id,
            learner_id=learner.id,
            status=AttemptStatus.IN_PROGRESS,
            started_at=now,
            expires_at=now + timedelta(minutes=exam.duration_minutes),
        )
        # Held through the relationship rather than `db.add`, so the in-memory
        # paper already shows its sitting to the next read in this session.
        exam.attempts.append(attempt)
        await db.commit()
        await db.refresh(attempt)

    questions = [
        QuestionForLearner(
            id=q.id, position=q.position, type=q.type, prompt=q.prompt,
            points=q.points, options=q.options,
        )
        for q in _paper_questions(exam, attempt)
    ]
    return PaperForLearner(
        exam_id=exam.id,
        attempt_id=attempt.id,
        title=exam.title,
        instructions=exam.instructions,
        state=attempt.status.value,
        status=attempt.status,
        expires_at=to_utc_iso(attempt.expires_at),
        due_at=to_utc_iso(exam.due_at),
        seconds_left=_seconds_ahead(
            attempt.expires_at if attempt.status == AttemptStatus.IN_PROGRESS else exam.due_at,
            utc_now(),
        ),
        question_count=len(questions),
        total_points=_total_points(_questions_of(exam)),
        duration_minutes=exam.duration_minutes,
        questions=questions,
    )


@router.post("/learner/exams/{exam_id}/answers", response_model=ExamActionResult)
async def save_answer(
    exam_id: int,
    payload: AnswerUpsertRequest,
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    """Autosave one answer against (attempt, question).

    Past the deadline the write is dropped rather than rejected loudly: the
    client's countdown may have just run out, and a saved answer is graded by
    the submit call, not by this one.
    """
    exam = await _get_exam_for_learner(exam_id, learner, db)
    attempt = await _close_if_overdue(exam, _attempt_of(exam), db)

    if not attempt:
        raise HTTPException(
            status_code=409,
            detail="Start the paper before answering it",
        )
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return ExamActionResult(
            exam_id=exam.id,
            attempt_id=attempt.id,
            status=attempt.status.value,
            updated_at=to_utc_iso(attempt.updated_at or utc_now()),
        )

    q = next((item for item in exam.questions if item.id == payload.question_id), None)
    if not q:
        raise HTTPException(
            status_code=400,
            detail="That question is not on this paper",
        )

    answers = _answer_map(attempt)
    ans = answers.get(q.id)
    if ans is None:
        ans = ExamAnswer(attempt_id=attempt.id, question_id=q.id)
        attempt.answers.append(ans)

    if q.type == QuestionType.MULTIPLE_CHOICE:
        # Checked before anything is mutated, so a rejected write cannot leave
        # an answer half-saved against an option that does not exist.
        if payload.choice_index is not None and (not q.options or payload.choice_index >= len(q.options)):
            raise HTTPException(
                status_code=400,
                detail="That option does not exist",
            )
        ans.choice_index = payload.choice_index
    else:
        ans.text = payload.text

    await db.commit()
    await db.refresh(attempt)
    return ExamActionResult(
        exam_id=exam.id,
        attempt_id=attempt.id,
        status=attempt.status.value,
        updated_at=to_utc_iso(attempt.updated_at or utc_now()),
    )


@router.post("/learner/exams/{exam_id}/submit", response_model=ExamSubmitResult)
async def submit_exam(
    exam_id: int,
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    """Close the sitting and mark the objective half. No result is shown."""
    exam = await _get_exam_for_learner(exam_id, learner, db)
    attempt = _attempt_of(exam)
    if not attempt:
        raise HTTPException(status_code=409, detail="You have not started this paper")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=409,
            detail=f"This paper is already {attempt.status.value}",
        )

    now = utc_now()
    # Arriving late is not refused. The attempt is marked on what was actually
    # answered and labelled `expired`, which tells the learner and the tutor
    # the truth instead of silently accepting an overrun or blocking the submit.
    timed_out = now > attempt.expires_at or now > exam.due_at
    _score_objective(exam, attempt)
    attempt.total_points = _total_points(_questions_of(exam))
    attempt.submitted_at = now
    attempt.status = (
        AttemptStatus.EXPIRED if timed_out else AttemptStatus.SUBMITTED
    )

    await notify_user(
        db,
        exam.tutor_id,
        "exam_submitted",
        f"{learner.full_name} submitted: {exam.title}",
        f"{learner.full_name} finished '{exam.title}'. "
        f"Objective answers are marked; written answers are waiting for you.",
        link=f"/tutor/exams/{exam.id}",
    )

    await db.commit()
    await db.refresh(attempt)
    return ExamSubmitResult(
        exam_id=exam.id,
        attempt_id=attempt.id,
        status=attempt.status.value,
        auto_score=attempt.auto_score,
        total_points=attempt.total_points,
        updated_at=to_utc_iso(attempt.submitted_at),
    )


@router.get("/learner/exams/{exam_id}/result", response_model=ResultForLearner)
async def read_result(
    exam_id: int,
    learner: User = Depends(_require_learner),
    db: AsyncSession = Depends(get_db),
):
    """The marked paper - available only after the tutor releases it."""
    exam = await _get_exam_for_learner(exam_id, learner, db)
    attempt = await _close_if_overdue(exam, _attempt_of(exam), db)

    if not attempt or attempt.status != AttemptStatus.RELEASED:
        raise HTTPException(
            status_code=409,
            detail="Your tutor has not published this result yet",
        )

    answers = _answer_map(attempt)
    details = []
    for q in _questions_of(exam):
        ans = answers.get(q.id)
        chosen = (
            q.options[ans.choice_index]
            if ans and ans.choice_index is not None and q.options
            and ans.choice_index < len(q.options)
            else None
        )
        details.append(
            LearnerAnswerDetail(
                question_id=q.id,
                prompt=q.prompt,
                type=q.type,
                points=q.points,
                choice_index=ans.choice_index if ans else None,
                chosen_option=chosen,
                text=ans.text if ans else None,
                awarded_points=ans.awarded_points if ans else None,
                feedback=ans.feedback if ans else None,
                # The verdict, never the key: a learner learns they were wrong.
                correct=(
                    ans.choice_index == q.correct_index
                    if q.type == QuestionType.MULTIPLE_CHOICE and ans
                    else None
                ),
            )
        )

    tutor = (
        await db.execute(select(User).where(User.id == exam.tutor_id))
    ).scalar_one_or_none()

    return ResultForLearner(
        exam_id=exam.id,
        title=exam.title,
        status=attempt.status,
        score=(attempt.auto_score or 0) + (attempt.manual_score or 0),
        total_points=attempt.total_points or _total_points(_questions_of(exam)),
        auto_score=attempt.auto_score,
        manual_score=attempt.manual_score,
        submitted_at=to_utc_iso(attempt.submitted_at) if attempt.submitted_at else None,
        released_at=to_utc_iso(attempt.released_at) if attempt.released_at else None,
        level_before=attempt.level_before,
        level_after=attempt.level_after,
        tutor_name=tutor.full_name if tutor else None,
        answers=details,
    )
