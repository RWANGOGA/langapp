from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import ProficiencyLevel, ClassStatus


class TutorBasic(BaseModel):
    name: str
    country: str
    avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerBasic(BaseModel):
    name: str
    level: str
    avatar: Optional[str] = None
    unread: int = 0

    model_config = ConfigDict(from_attributes=True)


class NextClassResponse(BaseModel):
    # The id is what lets the learner's dashboard deep-link into an in-app
    # room; a response class without it would silently drop it, since
    # FastAPI only serializes declared fields.
    classId: Optional[int] = None
    title: str
    secondsLeft: int
    startsAt: Optional[str] = None  # explicit UTC ISO instant (+00:00)
    zoomUrl: Optional[str] = None
    meetUrl: Optional[str] = None
    inAppCall: bool = False
    packageName: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProgressResponse(BaseModel):
    percent: int
    level: str
    completed: int
    total: int

    model_config = ConfigDict(from_attributes=True)


class ClassItemResponse(BaseModel):
    id: int
    startsAt: str  # explicit UTC ISO instant (+00:00) for local rendering
    title: str

    model_config = ConfigDict(from_attributes=True)


class ExamsSummaryResponse(BaseModel):
    """The exam band on the dashboard: how many papers are open, and the soonest.

    A count and one deadline, not a list - the list is its own page, and a
    second copy of it here would be a second thing to keep in sync.
    """

    pending: int
    dueAt: Optional[str] = None  # earliest deadline among the pending papers

    model_config = ConfigDict(from_attributes=True)


class LearnerDashboardResponse(BaseModel):
    learner: LearnerBasic
    tutor: Optional[TutorBasic] = None
    nextClass: Optional[NextClassResponse] = None
    progress: ProgressResponse
    classes: list[ClassItemResponse]
    exams: ExamsSummaryResponse

    model_config = ConfigDict(from_attributes=True)