"""add subscriptions and payment events

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("tier", sa.String(30), nullable=False),
        sa.Column("status", sa.Enum("active", "past_due", "cancelled", "expired", name="subscriptionstatus"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("current_period_end", sa.DateTime(), nullable=False),
        sa.Column("next_renewal_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_current_period_end", "subscriptions", ["current_period_end"])
    op.create_index("ix_subscriptions_next_renewal_at", "subscriptions", ["next_renewal_at"])
    op.create_table(
        "payment_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("actor_type", sa.String(30), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("provider_event_id", sa.String(180), unique=True, nullable=True),
        sa.Column("previous_state", sa.String(50), nullable=True),
        sa.Column("new_state", sa.String(50), nullable=True),
        sa.Column("amount_minor", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("correlation_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_payment_events_event_type", "payment_events", ["event_type"])
    op.create_index("ix_payment_events_user_id", "payment_events", ["user_id"])
    op.create_index("ix_payment_events_order_id", "payment_events", ["order_id"])
    op.create_index("ix_payment_events_created_at", "payment_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("payment_events")
    op.drop_index("ix_subscriptions_next_renewal_at", table_name="subscriptions")
    op.drop_index("ix_subscriptions_current_period_end", table_name="subscriptions")
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")
    sa.Enum(name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
