from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class TutorDashboardTutor(BaseModel):
    name: str
    role: str
    unread: int


class TutorDashboardNextSession(BaseModel):
    sessionId: str
    learner: str
    topic: str
    secondsLeft: int
    startsAt: Optional[str] = None  # explicit UTC ISO instant (+00:00)
    meetingUrl: Optional[str] = None


class LearnerSummary(BaseModel):
    id: str
    name: str
    nativeLanguage: str
    goal: str
    level: str


class SessionItem(BaseModel):
    id: str
    date: str
    time: str
    startsAt: str  # explicit UTC ISO instant (+00:00) for local rendering
    status: str
    learner: str
    topic: str
    provider: Optional[str] = None
    meetingUrl: Optional[str] = None


class TutorDashboardResponse(BaseModel):
    tutor: TutorDashboardTutor
    next: TutorDashboardNextSession
    learners: List[LearnerSummary]
    today: str
    sessions: List[SessionItem]

    model_config = ConfigDict(from_attributes=True)