"""create testimonials and open the wall with three pilot notes

Revision ID: d7f3a1b4c8e2
Revises: c1d2e3f4a5b6
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d7f3a1b4c8e2"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KIND = sa.Enum("LEARNER", "TUTOR", "PILOT", name="testimonialkind")

# The wall cannot start empty, and it must not start with invented people either.
# These three are the school's own notes from the pilot programme: no account
# behind them, `is_pilot_note` set, and the page labels them as notes rather than
# reviews. Real testimonials from learner and tutor dashboards join them as
# themselves.
PILOT_NOTES = [
    (
        "Pilot cohort · Sharjah",
        "Sharjah, UAE",
        "Fourteen weeks of Wednesday evenings: two engineers who could read the "
        "manual but not say a word in the stand-up. By the last month they were "
        "running it.",
    ),
    (
        "Pilot cohort · Tokyo",
        "Tokyo, Japan",
        "Our first learner was a nurse preparing for a clinical exam. She asked "
        "for pronunciation, not grammar, and that is what we taught. It changed "
        "how we plan every course since.",
    ),
    (
        "Pilot cohort · tutor bench",
        "Lyon, France",
        "Identity checks, verified qualifications, an observed demo lesson before "
        "anyone is approved. Strict on purpose: it is the reason a name next to a "
        "quote here means something.",
    ),
]


def upgrade() -> None:
    op.create_table(
        "testimonials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("author_name", sa.String(length=120), nullable=False),
        sa.Column("author_kind", KIND, nullable=False),
        sa.Column("author_region", sa.String(length=80), nullable=True),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("is_pilot_note", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    # One person, one testimonial. NULLs are unaffected, so the pilot notes -
    # which belong to no account - can sit alongside it.
    op.create_index("ix_testimonials_user_id", "testimonials", ["user_id"], unique=True)
    op.create_index("ix_testimonials_created_at", "testimonials", ["created_at"])

    now = datetime(2026, 10, 26, 9, 0, 0)
    op.bulk_insert(
        sa.table(
            "testimonials",
            sa.column("author_name", sa.String),
            sa.column("author_region", sa.String),
            sa.column("quote", sa.Text),
            sa.column("user_id", sa.Integer),
            sa.column("author_kind", KIND),
            sa.column("is_pilot_note", sa.Boolean),
            sa.column("created_at", sa.DateTime),
            sa.column("updated_at", sa.DateTime),
        ),
        [
            {
                "author_name": name,
                "author_region": region,
                "quote": quote,
                "user_id": None,
                "author_kind": "PILOT",
                "is_pilot_note": True,
                "created_at": now,
                "updated_at": now,
            }
            for name, region, quote in PILOT_NOTES
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_testimonials_created_at", table_name="testimonials")
    op.drop_index("ix_testimonials_user_id", table_name="testimonials")
    op.drop_table("testimonials")
    KIND.drop(op.get_bind(), checkfirst=True)
