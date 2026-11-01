"""Tutor-authored exams.

A tutor writes a paper for one learner, sets how long it takes and when it
expires, and is the only person who can grade and publish the result. The
shape of the data follows the pipeline every assessment system converges on -
paper, attempt, grading, release - with two rules doing most of the work:

* The server owns timing truth. `expires_at` is frozen the moment an attempt
  starts instead of being recomputed from `started_at` on every read, so a
  reload can never report a deadline the learner has not already been held to,
  and no client clock decides whether an answer counted.
* The answer key never leaves the tutor side. `correct_index` lives on the
  question row and is dropped by the learner-facing response schema, so the
  paper a learner sits carries no hint of which option is right.

Level fields are plain strings rather than the `ProficiencyLevel` enum: reusing
that Postgres type across tables buys nothing, and the Pydantic schema already
validates the value on the way in. What matters is that a level change is
recorded against a named tutor with the level it replaced.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum as SQLEnum, ForeignKey, Index, Integer, String,
    Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, stored_enum_values
from app.models.user import User


class ExamStatus(str, enum.Enum):
    PUBLISHED = "published"
    CLOSED = "closed"


class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    WRITTEN = "written"


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    RELEASED = "released"
    EXPIRED = "expired"


class Exam(Base):
    """One paper, authored by a tutor for one learner."""

    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tutor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    learner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    # How long one sitting lasts, and the instant after which it cannot be
    # opened at all. Both are the tutor's call per paper.
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # No draft state on purpose: publishing is the create action, so a
    # half-built paper can never exist where a learner might see it.
    status: Mapped[ExamStatus] = mapped_column(
        SQLEnum(ExamStatus, values_callable=stored_enum_values),
        default=ExamStatus.PUBLISHED, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tutor: Mapped["User"] = relationship(foreign_keys="Exam.tutor_id")
    learner: Mapped["User"] = relationship(foreign_keys="Exam.learner_id")
    questions: Mapped[list["ExamQuestion"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.position"
    )
    attempts: Mapped[list["ExamAttempt"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_exams_learner_due", "learner_id", "due_at"),
        Index("ix_exams_tutor_created", "tutor_id", "created_at"),
    )


class ExamQuestion(Base):
    """One item on a paper. Objective or written; the tutor weights it."""

    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    type: Mapped[QuestionType] = mapped_column(
        SQLEnum(QuestionType, values_callable=stored_enum_values), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # MCQ only: the option list, and which index is correct. `correct_index` is
    # the answer key - it must never appear in a learner payload.
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_index: Mapped[int | None] = mapped_column(Integer, nullable=True)

    exam: Mapped["Exam"] = relationship(back_populates="questions")

    __table_args__ = (
        Index("ix_exam_questions_exam_position", "exam_id", "position"),
    )


class ExamAttempt(Base):
    """One learner's sitting of one paper. One row per exam, by design."""

    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False
    )
    learner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        SQLEnum(AttemptStatus, values_callable=stored_enum_values),
        default=AttemptStatus.IN_PROGRESS, nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Objective points computed by the server, written points awarded by the
    # tutor, and the denominator frozen at submit so a later edit to the paper
    # cannot move the scale an already-submitted attempt is reported against.
    auto_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    manual_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The audited level decision: what the learner was, what the tutor set, and
    # who signed it. Null on both sides when the exam changed no level.
    level_before: Mapped[str | None] = mapped_column(String(5), nullable=True)
    level_after: Mapped[str | None] = mapped_column(String(5), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    released_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exam: Mapped["Exam"] = relationship(back_populates="attempts")
    learner: Mapped["User"] = relationship(foreign_keys="ExamAttempt.learner_id")
    released_by_user: Mapped["User | None"] = relationship(foreign_keys="ExamAttempt.released_by")
    answers: Mapped[list["ExamAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )

    # One sitting per person per paper. A retake is an explicit tutor action.
    __table_args__ = (
        UniqueConstraint("exam_id", "learner_id", name="uq_exam_attempt_once"),
    )


class ExamAnswer(Base):
    """The learner's response to one question, plus the tutor's marking."""

    __tablename__ = "exam_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exam_questions.id", ondelete="CASCADE"), nullable=False
    )
    choice_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Null until marked. For an objective question the server fills it at
    # submit; for a written one only the tutor can.
    awarded_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attempt: Mapped["ExamAttempt"] = relationship(back_populates="answers")
    question: Mapped["ExamQuestion"] = relationship()

    # Autosave is an upsert, so a repeated save of the same question cannot
    # fork a second answer row.
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_exam_answer_per_question"),
    )
