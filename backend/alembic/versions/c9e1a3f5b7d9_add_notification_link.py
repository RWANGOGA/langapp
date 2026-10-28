"""add notifications.link

Notifications used to be text-only: you could read that a class was
cancelled or a tutor was assigned, but not act on it. A nullable relative
route is stored alongside each row (computed from the event type and the
recipient's role) so the bell's list can deep-link straight to the screen
that resolves it - the admin inbox, the learner's tutor card, the tutor's
schedule. Rows with no natural destination keep link = null and render as
plain text rather than pointing somewhere wrong.

Revision ID: c9e1a3f5b7d9
Revises: f8a1b3c5d7e9
Create Date: 2026-10-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c9e1a3f5b7d9'
down_revision: Union[str, None] = 'f8a1b3c5d7e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'notifications',
        sa.Column('link', sa.String(length=300), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('notifications', 'link')
