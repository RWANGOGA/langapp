from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MatchPlacement(Base):
    """One line in the record of how a learner came to have their tutor.

    Manual assignment does not scale to thousands of paid learners a month, so
    the engine chooses instead - and everything it chooses on has to survive the
    choice being made. A score with no reasons behind it is a hunch with a
    decimal point; this row keeps the ranking, the evidence strings that made
    it up, and who or what signed it, so staff can answer "why this tutor?"
    long after the order was paid.
    """

    __tablename__ = "match_placements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Nullable because an admin can place a learner who has not paid through an
    # order - support moves people, not just purchases.
    order_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    chosen_tutor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # "auto" when the engine decided, "admin" when a named person overrode it.
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    # The human behind an "admin" placement; None for an engine decision,
    # which is exactly the distinction the audit exists to draw.
    decided_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # The evidence, in plain sentences, in the order it was scored.
    reasons: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
