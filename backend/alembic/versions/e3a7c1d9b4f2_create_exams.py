"""create tutor-authored exams: papers, attempts and answers

Revision ID: e3a7c1d9b4f2
Revises: d7f2b4c9a1e3
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e3a7c1d9b4f2"
down_revision: Union[str, None] = "d7f2b4c9a1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum labels are the stored *values* (lowercase), matching how OrderStatus and
# SubscriptionStatus were created here - SQLAlchemy's default would bind member
# names instead and every insert would then fail the type check.
# Each type is created once, explicitly, and the columns below then refer to it
# with `create_type=False`: reusing one object for both made CREATE TABLE emit a
# second CREATE TYPE and the migration died on a fresh database.
EXAM_STATUS = postgresql.ENUM("published", "closed", name="examstatus")
QUESTION_TYPE = postgresql.ENUM(
    "multiple_choice", "written", name="questiontype"
)
ATTEMPT_STATUS = postgresql.ENUM(
    "in_progress", "submitted", "released", "expired", name="attemptstatus"
)


def upgrade() -> None:
    EXAM_STATUS.create(op.get_bind(), checkfirst=True)
    QUESTION_TYPE.create(op.get_bind(), checkfirst=True)
    ATTEMPT_STATUS.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tutor_id", sa.Integer(), nullable=False),
        sa.Column("learner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column(
            "shuffle_questions", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "status",
            postgresql.ENUM("published", "closed", name="examstatus", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tutor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exams_learner_due", "exams", ["learner_id", "due_at"])
    op.create_index("ix_exams_tutor_created", "exams", ["tutor_id", "created_at"])

    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "multiple_choice", "written", name="questiontype", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        # Postgres JSONB for the option list, matching the model column; the
        # test fixtures render it as plain JSON on SQLite.
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        # The answer key. Server-side only: no learner response carries it.
        sa.Column("correct_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_exam_questions_exam_position", "exam_questions", ["exam_id", "position"]
    )

    op.create_table(
        "exam_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("learner_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "in_progress",
                "submitted",
                "released",
                "expired",
                name="attemptstatus",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        # Frozen when the attempt starts, so a reload can never report a
        # deadline other than the one the learner is already held to.
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("auto_score", sa.Integer(), nullable=True),
        sa.Column("manual_score", sa.Integer(), nullable=True),
        sa.Column("total_points", sa.Integer(), nullable=True),
        # The audited level decision, kept as plain CEFR strings.
        sa.Column("level_before", sa.String(length=5), nullable=True),
        sa.Column("level_after", sa.String(length=5), nullable=True),
        sa.Column("released_at", sa.DateTime(), nullable=True),
        sa.Column("released_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["released_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        # One sitting per person per paper; a retake is an explicit tutor action.
        sa.UniqueConstraint("exam_id", "learner_id", name="uq_exam_attempt_once"),
    )

    op.create_table(
        "exam_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("choice_index", sa.Integer(), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("awarded_points", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["exam_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        # Autosave upserts against this key instead of forking duplicate answers.
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_exam_answer_per_question"),
    )


def downgrade() -> None:
    op.drop_table("exam_answers")
    op.drop_table("exam_attempts")
    op.drop_index("ix_exam_questions_exam_position", table_name="exam_questions")
    op.drop_table("exam_questions")
    op.drop_index("ix_exams_tutor_created", table_name="exams")
    op.drop_index("ix_exams_learner_due", table_name="exams")
    op.drop_table("exams")
    ATTEMPT_STATUS.drop(op.get_bind(), checkfirst=True)
    QUESTION_TYPE.drop(op.get_bind(), checkfirst=True)
    EXAM_STATUS.drop(op.get_bind(), checkfirst=True)
