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
