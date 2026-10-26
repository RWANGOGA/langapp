import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TestimonialKind(str, enum.Enum):
    """Who is speaking, as the page introduces them."""

    LEARNER = "LEARNER"
    TUTOR = "TUTOR"
    PILOT = "PILOT"


class Testimonial(Base):
    """One published sentence about learning or teaching here.

    `author_name` and `author_kind` are copied from the account at the moment of
    writing instead of joined at read time: a person who later changes their name
    or leaves the school must not have their words silently reattributed, and a
    pilot note has no account to join to at all.

    `is_pilot_note` is the honesty flag. The wall opens with a few notes from the
    pilot programme so it is not empty on day one; they are stored, served and
    rendered as notes, never dressed up as a paying customer's review.
    """

    __tablename__ = "testimonials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Unique: one person, one testimonial. Writing again edits the same record,
    # so the wall cannot be filled by one enthusiastic learner.
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    author_kind: Mapped[TestimonialKind] = mapped_column(
        SQLEnum(TestimonialKind), nullable=False, default=TestimonialKind.LEARNER
    )
    author_region: Mapped[str | None] = mapped_column(String(80), nullable=True)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    is_pilot_note: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
