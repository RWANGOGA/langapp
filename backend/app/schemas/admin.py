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
    country: str | None = None
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
    # Explicit UTC instant of the underlying record; the UI renders it in the
    # viewer's timezone. None when the row predates timestamp tracking.
    at: Optional[str] = None


class StatusCount(BaseModel):
    label: str
    color: str
    count: Optional[int] = None


class AdminDashboardResponse(BaseModel):
    unread: int = 0
    # Tutor applications the school currently owes a decision on. The overview
    # badges its review queue with this so an admin sees the work is there.
    applications_in_review: int = 0
    kpis: List[Kpi]
    tutors: List[Tutor]
    students: List[StudentSummary]
    student_names: List[str] = []
    matrix: List[MatrixRow]
    meetings: List[Meeting]
    plans: List[Plan]
    leaders: List[Leader]
    activity: List[Activity]
    statuses: List[StatusCount]


class StudentAssignmentRequest(BaseModel):
    student_id: int
    tutor_id: int


class StudentAssignmentResponse(BaseModel):
    student_id: int
    student_name: str
    tutor_id: int
    tutor_name: str
    # The stored placement moment; None for a placement made before the
    # stamp existed - the API reports the gap instead of inventing a time.
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[int] = None


class StudentUnassignResponse(BaseModel):
    student_id: int
    student_name: str
    previous_tutor_id: int
    previous_tutor_name: str
    unassigned_at: datetime
    unassigned_by: int


class MatchingQueueCandidate(BaseModel):
    """Who the engine would place a learner with, and the evidence behind it.
    The reasons are the same sentences the audit keeps - the queue is a
    preview of the decision, not a second opinion invented for display."""
    tutor_id: int
    tutor_name: str
    score: float
    reasons: List[str]


class MatchingQueueRow(BaseModel):
    order_id: int
    student_id: int
    student_name: str
    subject: Optional[str] = None
    # None when no approved tutor qualifies - the queue's whole point is to
    # say "this one needs a human", so it must be able to say it honestly.
    best_candidate: Optional[MatchingQueueCandidate] = None


class MatchingQueueResponse(BaseModel):
    queue: List[MatchingQueueRow]
    total: int


class ClassScheduleRequest(BaseModel):
    """An admin books the next lesson for a learner who already has a tutor.
    The class inherits that tutor - the request never names one, so a lesson
    can never land with someone the learner is not placed with."""
    learner_id: int
    title: str
    scheduled_at: datetime
    duration_minutes: int = 60


class AdminClassRow(BaseModel):
    id: int
    title: str
    learner_name: str
    tutor_name: str
    # Explicit UTC ISO instant (to_utc_iso), never the request time.
    scheduled_at: str
    duration_minutes: int
    status: str
    zoom_url: Optional[str] = None
    meet_url: Optional[str] = None


class AdminClassListResponse(BaseModel):
    classes: List[AdminClassRow]
    total: int
    page: int
    page_size: int
    total_pages: int