"""create match placements

Revision ID: f8a1b3c5d7e9
Revises: e2b7c9d4a1f8
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "f8a1b3c5d7e9"
down_revision: Union[str, None] = "e2b7c9d4a1f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "match_placements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("chosen_tutor_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("decided_by", sa.Integer(), nullable=True),
        sa.Column("score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("reasons", JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["chosen_tutor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["decided_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_match_placements_student_id", "match_placements", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_match_placements_student_id", table_name="match_placements")
    op.drop_table("match_placements")
