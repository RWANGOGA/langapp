from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl

from app.models.user import ClassStatus


class MeetingLinkRequest(BaseModel):
    # Only providers the platform actually renders today. MS Teams etc.
    # arrive with their own integration, not a free-form string.
    provider: Literal["zoom", "google_meet"]
    url: HttpUrl


class FeedbackRequest(BaseModel):
    topic: Optional[str] = Field(None, max_length=200)
    feedback: str = Field(..., min_length=1, max_length=4000)


class CancelRequest(BaseModel):
    # Optional for tutors (they must reschedule anyway); the learner-side
    # endpoint enforces "required inside the 24h window" as a business rule.
    reason: Optional[str] = Field(None, max_length=500)


class SessionActionResponse(BaseModel):
    class_id: int
    status: ClassStatus
    # Explicit UTC ISO instants (+00:00) - the browser converts to local time.
    starts_at: str
    updated_at: str
    zoom_url: Optional[str] = None
    meet_url: Optional[str] = None
    room_name: Optional[str] = None
    notes: Optional[str] = None


class CallResponse(BaseModel):
    # Everything the browser client needs to connect: the LiveKit server url,
    # the room, the caller's identity, and a short-lived scoped token.
    url: str
    room: str
    identity: str
    token: str
