from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class TutorDashboardTutor(BaseModel):
    name: str
    role: str
    unread: int


class TutorDashboardNextSession(BaseModel):
    sessionId: str
    # The row id plus whether a room is open. Both are declared because a
    # response model silently drops undeclared keys, and the portal's in-app
    # start state is built on exactly these two.
    classId: Optional[int] = None
    learner: str
    topic: str
    secondsLeft: int
    startsAt: Optional[str] = None  # explicit UTC ISO instant (+00:00)
    meetingUrl: Optional[str] = None
    inAppCall: bool = False


class LearnerSummary(BaseModel):
    id: str
    name: str
    nativeLanguage: str
    goal: str
    level: str


class SessionItem(BaseModel):
    id: str
    classId: Optional[int] = None
    date: str
    time: str
    startsAt: str  # explicit UTC ISO instant (+00:00) for local rendering
    status: str
    learner: str
    topic: str
    provider: Optional[str] = None
    meetingUrl: Optional[str] = None
    inAppCall: bool = False


class TutorDashboardResponse(BaseModel):
    tutor: TutorDashboardTutor
    next: TutorDashboardNextSession
    learners: List[LearnerSummary]
    today: str
    sessions: List[SessionItem]

    model_config = ConfigDict(from_attributes=True)