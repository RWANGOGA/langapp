"""add classes.room_name (in-app lesson calls)

Lessons have always run over an external link: a tutor pasted a Zoom or
Google Meet URL and both sides bounced out of the app to talk. This adds a
nullable in-app room to a class. When a tutor enables an in-app call the
room is named deterministically (`class-{id}`) and both the learner and the
tutor join it inside the product; a null room_name means the lesson still
uses an external link, so every existing row and flow is untouched.

Revision ID: d7f2b4c9a1e3
Revises: c9e1a3f5b7d9
Create Date: 2026-10-28 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd7f2b4c9a1e3'
down_revision: Union[str, None] = 'c9e1a3f5b7d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'classes',
        sa.Column('room_name', sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('classes', 'room_name')
