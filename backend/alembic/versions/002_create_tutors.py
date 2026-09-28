"""create tutors table

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:00

"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tutors',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('headline', sa.String(200), nullable=False),
        sa.Column('country', sa.String(50), nullable=False),
        sa.Column('rating', sa.Float, nullable=False, default=0.0),
        sa.Column('reviews', sa.Integer, nullable=False, default=0),
        sa.Column('years_experience', sa.Integer, nullable=False, default=0),
        sa.Column('bio', sa.Text, nullable=False, default=''),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'tutor_specialties',
        sa.Column('tutor_id', sa.String(50), sa.ForeignKey('tutors.id'), primary_key=True),
        sa.Column('specialty', sa.String(50), primary_key=True),
    )

    op.create_table(
        'tutor_languages',
        sa.Column('tutor_id', sa.String(50), sa.ForeignKey('tutors.id'), primary_key=True),
        sa.Column('language', sa.String(50), primary_key=True),
    )

    # Insert default tutors
    op.bulk_insert(
        sa.table(
            'tutors',
            sa.Column('id', sa.String(50)),
            sa.Column('name', sa.String(100)),
            sa.Column('headline', sa.String(200)),
            sa.Column('country', sa.String(50)),
            sa.Column('rating', sa.Float),
            sa.Column('reviews', sa.Integer),
            sa.Column('years_experience', sa.Integer),
            sa.Column('bio', sa.Text),
            sa.Column('created_at', sa.DateTime),
            sa.Column('updated_at', sa.DateTime),
        ),
        [
            {
                'id': 'sarah-johnson',
                'name': 'Sarah Johnson',
                'headline': 'Senior English Tutor - Business & Conversation',
                'country': 'USA',
                'rating': 4.9,
                'reviews': 412,
                'years_experience': 8,
                'bio': 'Corporate comms lead turned full-time tutor. I coach professionals preparing for client meetings and interviews.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
            {
                'id': 'david-kim',
                'name': 'David Kim',
                'headline': 'TOEIC and academic writing coach',
                'country': 'Canada',
                'rating': 5.0,
                'reviews': 268,
                'years_experience': 6,
                'bio': 'I specialize in TOEIC preparation and academic writing for university students.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
            {
                'id': 'emily-carter',
                'name': 'Emily Carter',
                'headline': 'IELTS examiner-trained speaking tutor',
                'country': 'UK',
                'rating': 4.8,
                'reviews': 190,
                'years_experience': 5,
                'bio': 'Cambridge-certified examiner. I break the B2 First and C1 Advanced papers into marks you can actually hit.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
            {
                'id': 'michael-brown',
                'name': 'Michael Brown',
                'headline': 'Relaxed everyday conversation practice',
                'country': 'Australia',
                'rating': 4.7,
                'reviews': 143,
                'years_experience': 4,
                'bio': 'Friendly tutor focusing on natural conversation and pronunciation.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
            {
                'id': 'olivia-martin',
                'name': 'Olivia Martin',
                'headline': 'Business English and TOEIC preparation',
                'country': 'USA',
                'rating': 4.9,
                'reviews': 356,
                'years_experience': 7,
                'bio': 'Corporate trainer turned tutor. Expert in business communication and TOEIC strategy.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
            {
                'id': 'daniel-wright',
                'name': 'Daniel Wright',
                'headline': 'IELTS band 7+ and interview skills',
                'country': 'Ireland',
                'rating': 4.8,
                'reviews': 221,
                'years_experience': 9,
                'bio': 'Examiner experience. I help students achieve band 7+ in IELTS speaking and writing.',
                'created_at': datetime(2024, 1, 1, 0, 0, 0),
                'updated_at': datetime(2024, 1, 1, 0, 0, 0),
            },
        ]
    )

    # Insert specialties
    op.bulk_insert(
        sa.table(
            'tutor_specialties',
            sa.Column('tutor_id', sa.String(50)),
            sa.Column('specialty', sa.String(50)),
        ),
        [
            {'tutor_id': 'sarah-johnson', 'specialty': 'Business'},
            {'tutor_id': 'sarah-johnson', 'specialty': 'Conversation'},
            {'tutor_id': 'david-kim', 'specialty': 'TOEIC'},
            {'tutor_id': 'david-kim', 'specialty': 'Academic'},
            {'tutor_id': 'emily-carter', 'specialty': 'IELTS'},
            {'tutor_id': 'emily-carter', 'specialty': 'Academic'},
            {'tutor_id': 'michael-brown', 'specialty': 'Conversation'},
            {'tutor_id': 'olivia-martin', 'specialty': 'Business'},
            {'tutor_id': 'olivia-martin', 'specialty': 'TOEIC'},
            {'tutor_id': 'daniel-wright', 'specialty': 'IELTS'},
            {'tutor_id': 'daniel-wright', 'specialty': 'Business'},
        ]
    )

    # Insert languages
    op.bulk_insert(
        sa.table(
            'tutor_languages',
            sa.Column('tutor_id', sa.String(50)),
            sa.Column('language', sa.String(50)),
        ),
        [
            {'tutor_id': 'sarah-johnson', 'language': 'English'},
            {'tutor_id': 'david-kim', 'language': 'English'},
            {'tutor_id': 'david-kim', 'language': 'Korean'},
            {'tutor_id': 'david-kim', 'language': 'Japanese'},
            {'tutor_id': 'emily-carter', 'language': 'English'},
            {'tutor_id': 'emily-carter', 'language': 'Vietnamese'},
            {'tutor_id': 'michael-brown', 'language': 'English'},
            {'tutor_id': 'olivia-martin', 'language': 'English'},
            {'tutor_id': 'olivia-martin', 'language': 'Japanese'},
            {'tutor_id': 'daniel-wright', 'language': 'English'},
            {'tutor_id': 'daniel-wright', 'language': 'Vietnamese'},
        ]
    )


def downgrade() -> None:
    op.drop_table('tutor_languages')
    op.drop_table('tutor_specialties')
    op.drop_table('tutors')