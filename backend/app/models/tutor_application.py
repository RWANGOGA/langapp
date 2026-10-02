import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, Boolean, Text, ForeignKey, Date, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    DOCUMENTS_REVIEW = "documents_review"
    ENGLISH_TEST = "english_test"
    DEMO_LESSON = "demo_lesson"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"


class TutorApplication(Base):
    __tablename__ = "tutor_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    status: Mapped[ApplicationStatus] = mapped_column(SQLEnum(ApplicationStatus), default=ApplicationStatus.SUBMITTED, nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1)

    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    date_of_birth: Mapped[Date | None] = mapped_column(Date, nullable=True)

    id_verification_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_verification_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    id_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    id_verification_status: Mapped[VerificationStatus] = mapped_column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING)

    qualification_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    qualification_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    qualification_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    english_proof_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    english_score: Mapped[str | None] = mapped_column(String(50), nullable=True)
    english_proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    english_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    intro_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)

    specialties: Mapped[str] = mapped_column(Text, nullable=False, default="")
    languages: Mapped[str] = mapped_column(Text, nullable=False, default="")

    availability_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    tech_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    code_of_conduct_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    privacy_agreement_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    recording_consent: Mapped[bool] = mapped_column(Boolean, default=False)

    reference_1_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_1_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_2_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_2_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    background_check_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    background_check_status: Mapped[VerificationStatus] = mapped_column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING)

    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    demo_lesson_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="tutor_application", foreign_keys="TutorApplication.user_id")

    __table_args__ = (
        Index("ix_tutor_applications_status", "status"),
    )