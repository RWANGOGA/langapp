"""create packages and orders tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'packages',
        sa.Column('id', sa.String(20), primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('months', sa.Integer, nullable=False),
        sa.Column('popular', sa.Boolean, default=False),
        sa.Column('price_jpy', sa.Integer, nullable=False),
        sa.Column('price_vnd', sa.Integer, nullable=False),
        sa.Column('price_usd', sa.Integer, nullable=False),
        sa.Column('features', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'orders',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('package_id', sa.String(20), sa.ForeignKey('packages.id'), nullable=False),
        sa.Column('user_id', sa.Integer, nullable=True),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', 'refunded', name='orderstatus'), default='pending'),
        sa.Column('payment_method', sa.Enum('card', 'line', 'paypay', 'zalopay', 'paypal', name='paymentmethod'), nullable=True),
        sa.Column('amount_jpy', sa.Integer, nullable=False),
        sa.Column('amount_vnd', sa.Integer, nullable=False),
        sa.Column('amount_usd', sa.Integer, nullable=False),
        sa.Column('external_payment_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Insert default packages
    op.bulk_insert(
        sa.table(
            'packages',
            sa.Column('id', sa.String(20)),
            sa.Column('name', sa.String(50)),
            sa.Column('months', sa.Integer),
            sa.Column('popular', sa.Boolean),
            sa.Column('price_jpy', sa.Integer),
            sa.Column('price_vnd', sa.Integer),
            sa.Column('price_usd', sa.Integer),
            sa.Column('features', sa.Text),
        ),
        [
            {
                'id': 'starter',
                'name': 'Starter (1-Month)',
                'months': 1,
                'popular': False,
                'price_jpy': 8000,
                'price_vnd': 1400000,
                'price_usd': 55,
                'features': '[{"icon": "clock", "label": "1 Month Access"}, {"icon": "list", "label": "Basic Features"}]',
            },
            {
                'id': 'intensive',
                'name': 'Intensive (3-Month)',
                'months': 3,
                'popular': True,
                'price_jpy': 20000,
                'price_vnd': 3500000,
                'price_usd': 140,
                'features': '[{"icon": "clock", "label": "3 Months Access"}, {"icon": "content", "label": "All Content"}, {"icon": "video", "label": "Live Sessions"}]',
            },
            {
                'id': 'mastery',
                'name': 'Mastery (6-Month)',
                'months': 6,
                'popular': False,
                'price_jpy': 36000,
                'price_vnd': 6300000,
                'price_usd': 250,
                'features': '[{"icon": "clock", "label": "6 Months Access"}, {"icon": "content", "label": "All Content"}, {"icon": "cert", "label": "Certification"}, {"icon": "mentor", "label": "1-on-1 Mentoring"}]',
            },
        ]
    )


def downgrade() -> None:
    op.drop_table('orders')
    op.drop_table('packages')