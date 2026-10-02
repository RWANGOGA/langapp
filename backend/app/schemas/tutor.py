from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class TutorBase(BaseModel):
    name: str
    headline: str
    country: str
    rating: float
    reviews: int
    years_experience: int
    bio: str = ""
    qualification_type: Optional[str] = None
    english_proof_type: Optional[str] = None
    english_score: Optional[str] = None
    intro_video_url: Optional[str] = None
    availability: Optional[str] = None
    onboarding_fee_usd: int = 0
    languages: List[str] = []
    specialties: List[str] = []


class TutorCreate(TutorBase):
    id: str
    avatar_url: Optional[str] = None
    qualification_type: Optional[str] = None
    english_proof_type: Optional[str] = None
    english_score: Optional[str] = None
    intro_video_url: Optional[str] = None
    availability: Optional[str] = None
    onboarding_fee_usd: Optional[int] = None


class TutorUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    country: Optional[str] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    languages: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    qualification_type: Optional[str] = None
    english_proof_type: Optional[str] = None
    english_score: Optional[str] = None
    intro_video_url: Optional[str] = None
    availability: Optional[str] = None
    onboarding_fee_usd: Optional[int] = None


class TutorRead(TutorBase):
    id: str
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TutorListResponse(BaseModel):
    tutors: List[TutorRead]
    total: int
    page: int
    page_size: int
    total_pages: int