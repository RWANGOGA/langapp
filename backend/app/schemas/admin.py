from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TutorStatus(str, Enum):
    ACTIVE = "Active"
    ASSIGNED = "Assigned"
    ONBOARDING = "Onboarding"


class CellStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    ALERT = "alert"
    ASSIGNED = "assigned"
    PLUS = "plus"
    EMPTY = "empty"


class Provider(str, Enum):
    GOOGLE_MEET = "Google Meet"
    ZOOM = "Zoom"
    MS_TEAMS = "MS Teams"


class PlanName(str, Enum):
    BASIC = "Basic"
    PRO = "Pro"
    PREMIUM = "Premium"


class Kpi(BaseModel):
    label: str
    value: str


class Tutor(BaseModel):
    id: str
    name: str
    email: str
    status: TutorStatus
    language: str
    rating: float
    assignments: int

    model_config = ConfigDict(from_attributes=True)


class MatrixRow(BaseModel):
    tutor: str
    cells: List[CellStatus]


class Meeting(BaseModel):
    provider: Provider
    sessions: List[str]
    connected: bool


class Plan(BaseModel):
    name: PlanName
    share: int
    color: str


class Leader(BaseModel):
    name: str
    value: int


class Activity(BaseModel):
    id: str
    initial: str
    text: str
    time: str


class StatusCount(BaseModel):
    label: str
    color: str


class BarGroup(BaseModel):
    label: str
    bars: List[dict]


class AdminDashboardResponse(BaseModel):
    kpis: List[Kpi]
    tutors: List[Tutor]
    matrix: List[MatrixRow]
    meetings: List[Meeting]
    plans: List[Plan]
    leaders: List[Leader]
    activity: List[Activity]
    statuses: List[StatusCount]
    bars: List[BarGroup]