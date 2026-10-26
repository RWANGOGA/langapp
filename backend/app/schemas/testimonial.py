from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.testimonial import TestimonialKind

# The wall is read in passing, so a quote has to hold its breath. Long enough to
# say something with a beginning and an end; short enough to finish on screen.
MIN_QUOTE = 40
MAX_QUOTE = 280


class TestimonialWrite(BaseModel):
    """What an author may send. Deliberately little: the account supplies the
    name and the identity, so neither can be claimed here."""

    quote: str = Field(min_length=MIN_QUOTE, max_length=MAX_QUOTE)
    region: str | None = Field(default=None, max_length=80)

    @field_validator("quote")
    @classmethod
    def _trim_quote(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < MIN_QUOTE:
            raise ValueError(f"a testimonial needs at least {MIN_QUOTE} characters of substance")
        return trimmed

    @field_validator("region")
    @classmethod
    def _trim_region(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class TestimonialRead(BaseModel):
    id: str
    name: str
    kind: TestimonialKind
    region: str | None
    quote: str
    is_pilot_note: bool
    created_at: datetime


class TestimonialList(BaseModel):
    testimonials: list[TestimonialRead]
    total: int
