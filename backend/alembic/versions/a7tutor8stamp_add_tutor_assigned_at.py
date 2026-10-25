"""add users.tutor_assigned_at

The placement moment was invented at read time (every row of
GET /admin/assignments answered with the request's utcnow()). It becomes a
stored fact: stamped when an admin assigns or auto-matching places a
learner, cleared on unassign.

Revision ID: a7tutor8stamp
Revises: 53690108df62
Create Date: 2026-10-25 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7tutor8stamp'
down_revision: Union[str, None] = '53690108df62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('tutor_assigned_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'tutor_assigned_at')
