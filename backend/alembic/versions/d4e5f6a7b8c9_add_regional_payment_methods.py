"""add regional payment methods

Revision ID: d4e5f6a7b8c9
Revises: b1c2d3e4f5a6
"""
from typing import Sequence, Union

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'momo'")
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'mobile_money'")


def downgrade() -> None:
    # PostgreSQL does not safely remove enum values in place. Keep the values
    # during downgrade rather than risking existing order data.
    pass
