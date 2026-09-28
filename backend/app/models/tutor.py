from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.session import Base


class TutorSpecialty(Base):
    __tablename__ = "tutor_specialties"

    tutor_id: Mapped[str] = mapped_column(String(50), ForeignKey("tutors.id"), primary_key=True)
    specialty: Mapped[str] = mapped_column(String(50), primary_key=True)


class TutorLanguage(Base):
    __tablename__ = "tutor_languages"

    tutor_id: Mapped[str] = mapped_column(String(50), ForeignKey("tutors.id"), primary_key=True)
    language: Mapped[str] = mapped_column(String(50), primary_key=True)


class Tutor(Base):
    __tablename__ = "tutors"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    _specialties: Mapped[list["TutorSpecialty"]] = relationship(
        back_populates="tutor",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    _languages: Mapped[list["TutorLanguage"]] = relationship(
        back_populates="tutor",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def specialties(self) -> list[str]:
        return [s.specialty for s in self._specialties]

    @specialties.setter
    def specialties(self, value: list[str]) -> None:
        self._specialties = [TutorSpecialty(specialty=s) for s in value]

    @property
    def languages(self) -> list[str]:
        return [l.language for l in self._languages]

    @languages.setter
    def languages(self, value: list[str]) -> None:
        self._languages = [TutorLanguage(language=l) for l in value]


TutorSpecialty.tutor = relationship("Tutor", back_populates="_specialties")
TutorLanguage.tutor = relationship("Tutor", back_populates="_languages")