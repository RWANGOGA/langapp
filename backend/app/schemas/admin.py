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
    language: str | None = None
    rating: float
    assignments: int
    qualification_type: str | None = None
    english_proof_type: str | None = None
    english_score: str | None = None
    intro_video_url: str | None = None
    availability: str | None = None
    onboarding_fee_usd: int = 0

    model_config = ConfigDict(from_attributes=True)


class MatrixRow(BaseModel):
    tutor: str
    cells: List[CellStatus]


class StudentSummary(BaseModel):
    id: int
    name: str
    email: str
    level: str
    tutor_name: str | None = None
    status: str


class Meeting(BaseModel):
    provider: str
    sessions: List[str]
    connected: bool


class Plan(BaseModel):
    name: str
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
    count: Optional[int] = None


class BarGroup(BaseModel):
    label: str
    bars: List[dict]


class AdminDashboardResponse(BaseModel):
    unread: int = 0
    kpis: List[Kpi]
    tutors: List[Tutor]
    students: List[StudentSummary]
    matrix: List[MatrixRow]
    meetings: List[Meeting]
    plans: List[Plan]
    leaders: List[Leader]
    activity: List[Activity]
    statuses: List[StatusCount]
    bars: List[BarGroup]


class StudentAssignmentRequest(BaseModel):
    student_id: int
    tutor_id: int


class StudentAssignmentResponse(BaseModel):
    student_id: int
    student_name: str
    tutor_id: int
    tutor_name: str
    assigned_at: datetime
    assigned_by: Optional[int] = None


class StudentUnassignResponse(BaseModel):
    student_id: int
    student_name: str
    previous_tutor_id: int
    previous_tutor_name: str
    unassigned_at: datetime
    unassigned_by: int