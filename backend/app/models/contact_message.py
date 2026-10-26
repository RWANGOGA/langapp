from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ContactMessage(Base):
    """A message from the public contact form.

    Visitors have no account, so nothing here points at `users` for the sender;
    the address they type is the only way back to them. The reply is stored on
    the same row rather than in a table of its own: there is exactly one answer
    per enquiry, and correcting it should revise that answer, not stack a second
    one beside it.
    """

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    topic: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_handled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # What staff said back, and who said it. `replied_by` is a real foreign key
    # because "answered" is only checkable if it names a person.
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replied_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
