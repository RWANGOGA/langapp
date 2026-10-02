"""add tutor evidence links

Revision ID: b1c2d3e4f5a6
Revises: 9d4f7a1b2c3d
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9d4f7a1b2c3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tutor_applications", sa.Column("id_document_url", sa.String(length=500), nullable=True))
    op.add_column("tutor_applications", sa.Column("english_proof_url", sa.String(length=500), nullable=True))
    op.add_column("tutors", sa.Column("qualification_type", sa.String(length=50), nullable=True))
    op.add_column("tutors", sa.Column("english_proof_type", sa.String(length=50), nullable=True))
    op.add_column("tutors", sa.Column("english_score", sa.String(length=50), nullable=True))
    op.add_column("tutors", sa.Column("intro_video_url", sa.String(length=500), nullable=True))
    op.add_column("tutors", sa.Column("availability", sa.Text(), nullable=True))
    op.add_column("tutors", sa.Column("onboarding_fee_usd", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("tutors", "onboarding_fee_usd")
    op.drop_column("tutors", "availability")
    op.drop_column("tutors", "intro_video_url")
    op.drop_column("tutors", "english_score")
    op.drop_column("tutors", "english_proof_type")
    op.drop_column("tutors", "qualification_type")
    op.drop_column("tutor_applications", "english_proof_url")
    op.drop_column("tutor_applications", "id_document_url")