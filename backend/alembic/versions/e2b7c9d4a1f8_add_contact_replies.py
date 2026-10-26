"""record the answer given to a contact message

Revision ID: e2b7c9d4a1f8
Revises: d7f3a1b4c8e2

The public form already stored the question and flagged it handled. What was
missing is the reply itself: who wrote it, when, and what they said. Without
those three columns "answered" is a checkbox that no second administrator can
check, and a promise that turns out to be wrong cannot be read back.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e2b7c9d4a1f8"
down_revision: Union[str, None] = "d7f3a1b4c8e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contact_messages", sa.Column("reply", sa.Text(), nullable=True))
    op.add_column("contact_messages", sa.Column("replied_at", sa.DateTime(), nullable=True))
    # SET NULL rather than CASCADE: deleting a staff account must not take the
    # record of what that account told a customer along with it.
    op.add_column(
        "contact_messages",
        sa.Column(
            "replied_by",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_contact_messages_replied_by", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    # The queue is read as "what is still open, newest first".
    op.create_index(
        "ix_contact_messages_handled_created",
        "contact_messages",
        ["is_handled", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_contact_messages_handled_created", table_name="contact_messages")
    op.drop_column("contact_messages", "replied_by")
    op.drop_column("contact_messages", "replied_at")
    op.drop_column("contact_messages", "reply")
