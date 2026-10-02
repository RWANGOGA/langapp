"""create notifications

Revision ID: 9d4f7a1b2c3d
Revises: 718aabbd3d4d
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d4f7a1b2c3d"
down_revision: Union[str, None] = "718aabbd3d4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("notification_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notifications_recipient_id", table_name="notifications")
    op.drop_table("notifications")