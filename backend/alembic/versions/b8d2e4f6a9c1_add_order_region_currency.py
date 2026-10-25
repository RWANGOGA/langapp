"""order region and currency

An order stored all three prices but never which one the student was actually
charged - the checkout validated a region, then threw it away. Both columns are
nullable and stay null on existing rows: the money that already arrived has no
recoverable currency, and guessing one would put a wrong total on the ledger.

Revision ID: b8d2e4f6a9c1
Revises: a7tutor8stamp
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8d2e4f6a9c1"
down_revision: Union[str, None] = "a7tutor8stamp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("region", sa.String(length=10), nullable=True))
    op.add_column("orders", sa.Column("currency", sa.String(length=3), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "currency")
    op.drop_column("orders", "region")
