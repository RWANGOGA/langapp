"""Exam request/response shapes.

Split deliberately: a tutor sees the answer key, a learner never does. Two
question models rather than one with an optional field means a missing key is
the shape of the class, not a value that can be forgotten at a call site.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.exam import AttemptStatus, ExamStatus, QuestionType


class QuestionCreate(BaseModel):
    position: int = Field(0, ge=0, le=200)
    type: QuestionType
    prompt: str = Field(..., min_length=1, max_length=5000)
    points: int = Field(1, ge=0, le=100)
    options: Optional[list[str]] = Field(None, max_length=10)
    correct_index: Optional[int] = Field(None, ge=0, le=9)

    @model_validator(mode="after")
    def objective_needs_key(self):
        """An MCQ without a correct option cannot be marked, so it cannot ship.

        Written questions carry neither field - there is nothing to key.
        """
        if self.type == QuestionType.MULTIPLE_CHOICE:
            if not self.options or len(self.options) < 2:
                raise ValueError("A multiple-choice question needs at least two options")
            if self.correct_index is None:
                raise ValueError("A multiple-choice question needs a correct option")
            if self.correct_index >= len(self.options):
                raise ValueError("The correct option is outside the option list")
        else:
            self.options = None
            self.correct_index = None
        return self


class ExamCreateRequest(BaseModel):
    # The paper is written for one learner, and the endpoint checks that the
    # tutor actually holds them - a tutor with five learners has to name one.
    learner_id: int
    title: str = Field(..., min_length=1, max_length=200)
    instructions: Optional[str] = Field(None, max_length=4000)
    duration_minutes: int = Field(30, ge=1, le=480)
    # The instant after which the paper cannot be opened. Accepted with or
    # without an offset; stored as naive UTC like every other column here.
    due_at: datetime
    shuffle_questions: bool = False
    questions: list[QuestionCreate] = Field(..., min_length=1, max_length=200)


class ExamUpdateRequest(BaseModel):
    """Meta edit. Questions are replaced wholesale, and only before a sitting."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    instructions: Optional[str] = Field(None, max_length=4000)
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    due_at: Optional[datetime] = None
    shuffle_questions: Optional[bool] = None
    questions: Optional[list[QuestionCreate]] = None


class AnswerUpsertRequest(BaseModel):
    question_id: int
    choice_index: Optional[int] = Field(None, ge=0, le=9)
    text: Optional[str] = Field(None, max_length=20000)


class GradeEntry(BaseModel):
    question_id: int
    awarded_points: int = Field(..., ge=0, le=100)
    feedback: Optional[str] = Field(None, max_length=4000)


class GradeRequest(BaseModel):
    answers: list[GradeEntry] = Field(..., min_length=1)


class ReleaseRequest(BaseModel):
    # Optional CEFR change decided at release. Absent means the exam moved
    # nothing, which is recorded as such rather than inventing a level.
    new_level: Optional[Literal["A1", "A2", "B1", "B2", "C1", "C2"]] = None


class QuestionForTutor(BaseModel):
    id: int
    position: int
    type: QuestionType
    prompt: str
    points: int
    options: Optional[list[str]] = None
    correct_index: Optional[int] = None


class QuestionForLearner(BaseModel):
    id: int
    position: int
    type: QuestionType
    prompt: str
    points: int
    options: Optional[list[str]] = None
    # No correct_index: the learner sits the paper without the answer key.


class AnswerForTutor(BaseModel):
    id: int
    question_id: int
    choice_index: Optional[int] = None
    text: Optional[str] = None
    awarded_points: Optional[int] = None
    feedback: Optional[str] = None
    correct: Optional[bool] = None


class AttemptForTutor(BaseModel):
    id: int
    learner_id: int
    status: AttemptStatus
    started_at: str
    expires_at: str
    submitted_at: Optional[str] = None
    auto_score: Optional[int] = None
    manual_score: Optional[int] = None
    total_points: Optional[int] = None
    level_before: Optional[str] = None
    level_after: Optional[str] = None
    released_at: Optional[str] = None
    answers: list[AnswerForTutor] = []


class ExamSummaryForLearner(BaseModel):
    id: int
    title: str
    instructions: Optional[str] = None
    status: ExamStatus
    question_count: int
    total_points: int
    duration_minutes: int
    due_at: str
    # Derived state the dashboard renders: available | in_progress | submitted
    # | released | expired. Computed server-side from the clock, never trusted
    # from the client.
    state: str
    # Seconds left on the sitting window (in progress) or on the open window
    # (not yet started). Same convention as the dashboards' class countdown.
    seconds_left: int = 0


class ExamListItemForTutor(BaseModel):
    id: int
    title: str
    learner_id: int
    learner_name: str
    status: ExamStatus
    question_count: int
    total_points: int
    duration_minutes: int
    due_at: str
    created_at: str
    attempt: Optional[AttemptForTutor] = None


class ExamDetailForTutor(BaseModel):
    exam: ExamListItemForTutor
    questions: list[QuestionForTutor]


class PaperForLearner(BaseModel):
    exam_id: int
    # Null until the learner starts; a read of an unstarted paper describes it
    # without opening a sitting.
    attempt_id: Optional[int] = None
    title: str
    instructions: Optional[str] = None
    state: str
    status: Optional[AttemptStatus] = None
    # The frozen deadline this sitting is held to, plus the countdown seeded
    # from the server clock. The browser counts down from here; it never
    # decides anything.
    expires_at: Optional[str] = None
    due_at: str
    seconds_left: int = 0
    # Sizes of the paper before it is opened: a cover page has to say how many
    # questions and how many points are coming without handing out the prompts.
    question_count: int = 0
    total_points: int = 0
    duration_minutes: int = 0
    questions: list[QuestionForLearner] = []


class LearnerAnswerDetail(BaseModel):
    question_id: int
    prompt: str
    type: QuestionType
    points: int
    choice_index: Optional[int] = None
    chosen_option: Optional[str] = None
    text: Optional[str] = None
    awarded_points: Optional[int] = None
    feedback: Optional[str] = None
    # Only ever the boolean verdict, never the key itself.
    correct: Optional[bool] = None


class ResultForLearner(BaseModel):
    exam_id: int
    title: str
    status: AttemptStatus
    score: int
    total_points: int
    auto_score: Optional[int] = None
    manual_score: Optional[int] = None
    submitted_at: Optional[str] = None
    released_at: Optional[str] = None
    level_before: Optional[str] = None
    level_after: Optional[str] = None
    tutor_name: Optional[str] = None
    answers: list[LearnerAnswerDetail] = []


class ExamActionResult(BaseModel):
    """Uniform reply for the write actions on both sides."""

    exam_id: int
    attempt_id: Optional[int] = None
    status: str
    updated_at: str


class ExamSubmitResult(BaseModel):
    """Submit answers, because the learner is entitled to know the paper closed.

    It reports the objective total and the denominator - both facts about the
    sitting itself - and nothing about which answers were right, which stays
    behind the release door like every other mark.
    """

    exam_id: int
    attempt_id: int
    status: str
    auto_score: Optional[int] = None
    total_points: Optional[int] = None
    updated_at: str
