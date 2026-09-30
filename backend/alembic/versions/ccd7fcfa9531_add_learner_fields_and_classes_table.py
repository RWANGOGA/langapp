"""add learner fields and classes table

Revision ID: ccd7fcfa9531
Revises: 7b8953a6874f
Create Date: 2026-09-28 18:53:29.409965

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ccd7fcfa9531'
down_revision: Union[str, None] = '7b8953a6874f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEVELS = ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')


def upgrade() -> None:
    postgresql.ENUM(*LEVELS, name='proficiencylevel').create(op.get_bind(), checkfirst=True)
    op.add_column('users', sa.Column('tutor_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column(
        'proficiency_level',
        postgresql.ENUM(*LEVELS, name='proficiencylevel', create_type=False),
        nullable=True,
    ))
    op.create_foreign_key('fk_users_tutor_id_users', 'users', 'users', ['tutor_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_users_tutor_id_users', 'users', type_='foreignkey')
    op.drop_column('users', 'proficiency_level')
    op.drop_column('users', 'tutor_id')
    postgresql.ENUM(name='proficiencylevel').drop(op.get_bind(), checkfirst=True)
