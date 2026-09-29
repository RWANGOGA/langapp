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
    title: str
    secondsLeft: int
    zoomUrl: str
    meetUrl: str
    packageName: str

    model_config = ConfigDict(from_attributes=True)


class ProgressResponse(BaseModel):
    percent: int
    level: str
    completed: int
    total: int

    model_config = ConfigDict(from_attributes=True)


class ClassItemResponse(BaseModel):
    date: str
    time: str
    title: str

    model_config = ConfigDict(from_attributes=True)


class LearnerDashboardResponse(BaseModel):
    learner: LearnerBasic
    tutor: TutorBasic
    nextClass: NextClassResponse
    progress: ProgressResponse
    today: str
    classes: list[ClassItemResponse]

    model_config = ConfigDict(from_attributes=True)