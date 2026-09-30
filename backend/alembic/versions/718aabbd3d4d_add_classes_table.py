"""add classes table

Revision ID: 718aabbd3d4d
Revises: 66033398f0f3
Create Date: 2026-09-30 20:36:33.176810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '718aabbd3d4d'
down_revision: Union[str, None] = '66033398f0f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('classes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('learner_id', sa.Integer(), nullable=False),
        sa.Column('tutor_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', name='classstatus'), nullable=False),
        sa.Column('zoom_url', sa.String(length=500), nullable=True),
        sa.Column('meet_url', sa.String(length=500), nullable=True),
        sa.Column('package_name', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tutor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_classes_learner_scheduled', 'classes', ['learner_id', 'scheduled_at'], unique=False)
    op.create_index('ix_classes_tutor_scheduled', 'classes', ['tutor_id', 'scheduled_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_classes_tutor_scheduled', table_name='classes')
    op.drop_index('ix_classes_learner_scheduled', table_name='classes')
    op.drop_table('classes')
    postgresql.ENUM(name='classstatus').drop(op.get_bind(), checkfirst=True)
