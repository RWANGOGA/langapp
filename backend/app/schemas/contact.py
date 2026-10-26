from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

# The four things people actually write in about. Kept as a closed set so the
# form's dropdown and the inbox notification can never drift apart.
ContactTopic = Literal["lessons", "pricing", "teaching", "account", "other"]


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    topic: ContactTopic = "other"
    # Long enough to say something; short enough that nobody pastes a book.
    message: str = Field(min_length=20, max_length=4000)

    @field_validator("name", "message")
    @classmethod
    def _trim(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 2:
            raise ValueError("must contain a real word")
        return trimmed


# How the admin queue is cut. `open` is the work left, `answered` is the record
# of what was said; `all` exists so a search can span both.
InboxState = Literal["open", "answered", "all"]


class ContactReply(BaseModel):
    """The answer an administrator writes into the thread."""

    reply: str = Field(min_length=20, max_length=4000)

    @field_validator("reply")
    @classmethod
    def _trim(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 20:
            raise ValueError("an answer has to say something")
        return trimmed


class ContactThread(BaseModel):
    """One enquiry with whatever was said back.

    The sender's address is included because the reply leaves from a human's own
    mailbox until a sending service is wired in - hiding it would make the
    thread unanswerable, and this surface is staff-only.

    Both instants are explicit UTC ISO strings, like every other timestamp this
    API serves: the queue shows "3 h ago", and that is the browser's arithmetic
    on a real instant, not the server's guess at a wall clock.
    """

    id: int
    name: str
    email: str
    topic: str
    message: str
    created_at: str
    is_handled: bool
    reply: str | None = None
    replied_at: str | None = None
    replied_by: int | None = None
    replied_by_name: str | None = None


class ContactInbox(BaseModel):
    messages: list[ContactThread]
    total: int
    open: int
    answered: int
