import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TUTOR = "tutor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    native_language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tutor_profile: Mapped["TutorProfile | None"] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="TutorProfile.user_id"
    )
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    tutor_application: Mapped["TutorApplication | None"] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="TutorApplication.user_id"
    )


class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    headline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    country: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(default=0.0)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    payout_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    intro_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="tutor_profile", foreign_keys="TutorProfile.user_id")
    specialties: Mapped[list["TutorProfileSpecialty"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    languages: Mapped[list["TutorProfileLanguage"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    availability: Mapped[list["TutorAvailability"]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class TutorProfileSpecialty(Base):
    __tablename__ = "tutor_profile_specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("tutor_profiles.id", ondelete="CASCADE"), nullable=False)
    specialty: Mapped[str] = mapped_column(String(50), nullable=False)

    profile: Mapped["TutorProfile"] = relationship(back_populates="specialties")


class TutorProfileLanguage(Base):
    __tablename__ = "tutor_profile_languages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("tutor_profiles.id", ondelete="CASCADE"), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)

    profile: Mapped["TutorProfile"] = relationship(back_populates="languages")


class TutorAvailability(Base):
    __tablename__ = "tutor_availability"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("tutor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False)

    profile: Mapped["TutorProfile"] = relationship(back_populates="availability")

    __table_args__ = (
        Index("ix_tutor_availability_profile_day", "profile_id", "day_of_week"),
    )