from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator
from typing import Optional, List
from datetime import datetime, date
from app.models.tutor_application import ApplicationStatus, VerificationStatus


class TutorApplicationStep1(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=1, max_length=50)
    date_of_birth: Optional[date] = None


class TutorApplicationStep2(BaseModel):
    id_verification_provider: Optional[str] = None
    id_verification_id: Optional[str] = None
    qualification_type: Optional[str] = Field(None, max_length=50)
    qualification_file_url: Optional[HttpUrl] = None


class TutorApplicationStep3(BaseModel):
    english_proof_type: Optional[str] = Field(None, max_length=50)
    english_score: Optional[str] = Field(None, max_length=50)


class TutorApplicationStep4(BaseModel):
    intro_video_url: Optional[HttpUrl] = None
    years_experience: int = Field(0, ge=0, le=50)


class TutorApplicationStep5(BaseModel):
    specialties: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)


class TutorApplicationStep6(BaseModel):
    availability: Optional[str] = None


class TutorApplicationStep7(BaseModel):
    tech_confirmed: bool = True
    code_of_conduct_accepted: bool = True
    privacy_agreement_accepted: bool = True
    recording_consent: bool = True


class TutorApplicationStep8(BaseModel):
    reference_1_name: Optional[str] = Field(None, max_length=100)
    reference_1_email: Optional[EmailStr] = None
    reference_2_name: Optional[str] = Field(None, max_length=100)
    reference_2_email: Optional[EmailStr] = None
    background_check_provider: Optional[str] = Field(None, max_length=50)


class TutorApplicationCreate(BaseModel):
    step1: TutorApplicationStep1
    step2: Optional[TutorApplicationStep2] = None
    step3: Optional[TutorApplicationStep3] = None
    step4: Optional[TutorApplicationStep4] = None
    step5: Optional[TutorApplicationStep5] = None
    step6: Optional[TutorApplicationStep6] = None
    step7: Optional[TutorApplicationStep7] = None
    step8: Optional[TutorApplicationStep8] = None


class TutorApplicationUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    country: Optional[str] = Field(None, min_length=1, max_length=50)
    date_of_birth: Optional[date] = None
    id_verification_provider: Optional[str] = None
    id_verification_id: Optional[str] = None
    id_verification_status: Optional[VerificationStatus] = None
    qualification_type: Optional[str] = Field(None, max_length=50)
    qualification_file_url: Optional[str] = None
    qualification_verified: Optional[bool] = None
    english_proof_type: Optional[str] = Field(None, max_length=50)
    english_score: Optional[str] = Field(None, max_length=50)
    english_verified: Optional[bool] = None
    intro_video_url: Optional[str] = None
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    specialties: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    availability_json: Optional[str] = None
    tech_confirmed: Optional[bool] = None
    code_of_conduct_accepted: Optional[bool] = None
    privacy_agreement_accepted: Optional[bool] = None
    recording_consent: Optional[bool] = None
    reference_1_name: Optional[str] = Field(None, max_length=100)
    reference_1_email: Optional[str] = None
    reference_2_name: Optional[str] = Field(None, max_length=100)
    reference_2_email: Optional[str] = None
    background_check_provider: Optional[str] = Field(None, max_length=50)
    background_check_status: Optional[VerificationStatus] = None
    admin_notes: Optional[str] = None
    demo_lesson_score: Optional[int] = Field(None, ge=0, le=100)


class TutorApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    admin_notes: Optional[str] = None
    demo_lesson_score: Optional[int] = Field(None, ge=0, le=100)


class TutorApplicationRead(BaseModel):
    id: int
    user_id: int
    status: ApplicationStatus
    current_step: int

    full_name: str
    country: str
    date_of_birth: Optional[date] = None

    id_verification_provider: Optional[str] = None
    id_verification_id: Optional[str] = None
    id_verification_status: VerificationStatus

    qualification_type: Optional[str] = None
    qualification_file_url: Optional[str] = None
    qualification_verified: bool

    english_proof_type: Optional[str] = None
    english_score: Optional[str] = None
    english_verified: bool

    intro_video_url: Optional[str] = None
    years_experience: int

    specialties: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)

    availability_json: Optional[str] = None

    tech_confirmed: bool
    code_of_conduct_accepted: bool
    privacy_agreement_accepted: bool
    recording_consent: bool

    reference_1_name: Optional[str] = None
    reference_1_email: Optional[str] = None
    reference_2_name: Optional[str] = None
    reference_2_email: Optional[str] = None
    background_check_provider: Optional[str] = None
    background_check_status: VerificationStatus

    admin_notes: Optional[str] = None
    demo_lesson_score: Optional[int] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("specialties", mode="before")
    @classmethod
    def parse_specialties(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v or []

    @field_validator("languages", mode="before")
    @classmethod
    def parse_languages(cls, v):
        if isinstance(v, str):
            return [l.strip() for l in v.split(",") if l.strip()]
        return v or []


class TutorApplicationListResponse(BaseModel):
    applications: List[TutorApplicationRead]
    total: int
    page: int
    page_size: int
    total_pages: int