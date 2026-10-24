"""
Public tutor directory.

The faculty list is derived from the real onboarding pipeline: a tutor appears
here if and only if their User account is an active tutor AND staff set
TutorProfile.is_approved. The legacy `tutors` table (a seed migration plus
rows old tests wrote into production) is no longer read or written — there
are intentionally no create/update/delete endpoints on this surface. Faculty
changes happen through the application-review workflow, never raw API writes.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import TutorProfile, User, UserRole
from app.schemas.tutor import TutorListResponse, TutorRead

router = APIRouter()

_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def availability_summary(profile: TutorProfile) -> Optional[str]:
    """Human-readable weekly windows from the tutor's real availability rows."""
    slots = sorted(profile.availability, key=lambda a: (a.day_of_week, a.start_time))
    if not slots:
        return None
    return "; ".join(
        f"{_DAY_NAMES[s.day_of_week]} {s.start_time}-{s.end_time}" for s in slots
    )


def _to_public(user: User, application_verified) -> TutorRead:
    """Project a User + TutorProfile onto the directory's wire format.

    `application_verified` is a (qualification, english_proof, english_score)
    tuple with each member set to None unless staff verified it — an
    applicant's own claim is not evidence for the public page.
    """
    profile = user.tutor_profile
    qualification_type, english_proof_type, english_score = application_verified
    return TutorRead(
        id=str(user.id),
        name=user.full_name,
        headline=profile.headline or "Certified English tutor",
        country=profile.country or "",
        rating=profile.rating,
        reviews=profile.reviews_count,
        years_experience=profile.years_experience,
        bio=profile.bio or "",
        avatar_url=user.avatar_url,
        qualification_type=qualification_type,
        english_proof_type=english_proof_type,
        english_score=english_score,
        intro_video_url=profile.intro_video_url,
        availability=availability_summary(profile),
        onboarding_fee_usd=0,
        languages=[l.language for l in profile.languages],
        specialties=[s.specialty for s in profile.specialties],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _verified_evidence(user: User):
    application = user.tutor_application
    if not application:
        return (None, None, None)
    return (
        application.qualification_type if application.qualification_verified else None,
        application.english_proof_type if application.english_verified else None,
        application.english_score if application.english_verified else None,
    )


_TUTOR_LOAD = (
    select(User)
    .join(TutorProfile, TutorProfile.user_id == User.id)
    .where(
        User.role == UserRole.TUTOR,
        User.is_active.is_(True),
        TutorProfile.is_approved.is_(True),
    )
    .options(
        selectinload(User.tutor_profile).selectinload(TutorProfile.specialties),
        selectinload(User.tutor_profile).selectinload(TutorProfile.languages),
        selectinload(User.tutor_profile).selectinload(TutorProfile.availability),
        selectinload(User.tutor_application),
    )
)


@router.get("/tutors", response_model=TutorListResponse)
async def get_tutors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(_TUTOR_LOAD)
    tutors = result.scalars().all()

    items = [_to_public(t, _verified_evidence(t)) for t in tutors]
    # Top of the list = proven classroom record; brand-new tutors sit below
    # with an honest 0.0 rating rather than a seeded 4.9.
    items.sort(key=lambda t: (-t.rating, -t.reviews, t.name))

    return TutorListResponse(
        tutors=items,
        total=len(items),
        page=1,
        page_size=len(items) or 1,
        total_pages=1,
    )


@router.get("/tutors/{tutor_id}", response_model=TutorRead)
async def get_tutor(tutor_id: str, db: AsyncSession = Depends(get_db)):
    if not tutor_id.isdigit():
        raise HTTPException(status_code=404, detail="Tutor not found")
    result = await db.execute(_TUTOR_LOAD.where(User.id == int(tutor_id)))
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return _to_public(tutor, _verified_evidence(tutor))
