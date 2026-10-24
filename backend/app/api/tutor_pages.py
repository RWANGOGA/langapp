"""Tutor portal pages: Learners roster, Schedule, Lesson Notes, Settings."""
from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.time import utc_now, to_utc_iso
from app.db.session import get_db
from app.models.user import User, UserRole, TutorProfile, TutorAvailability, Class, ClassStatus
from app.api.auth import get_current_user

router = APIRouter()

DEFAULT_SCHEDULE_DAYS = 60


async def _require_tutor(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only tutors can access this endpoint")
    return current_user


# — Learners —

@router.get("/tutor/learners")
async def tutor_learners(
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Everyone I teach: from my class history plus anyone assigned to me.

    Cancelled and no-show classes do not count towards the tallies -
    the roster answers "what have we done and what is still coming".
    """
    rows = await db.execute(
        select(Class.learner_id, Class.status, Class.scheduled_at).where(Class.tutor_id == tutor.id)
    )
    by_learner: dict[int, dict] = {}
    for learner_id, cls_status, scheduled_at in rows.all():
        agg = by_learner.setdefault(
            learner_id, {"completed": 0, "upcoming": 0, "last": None, "next": None}
        )
        if cls_status == ClassStatus.COMPLETED:
            agg["completed"] += 1
            if agg["last"] is None or scheduled_at > agg["last"]:
                agg["last"] = scheduled_at
        elif cls_status == ClassStatus.SCHEDULED and scheduled_at >= utc_now():
            agg["upcoming"] += 1
            if agg["next"] is None or scheduled_at < agg["next"]:
                agg["next"] = scheduled_at

    assigned = await db.execute(select(User.id).where(User.tutor_id == tutor.id))
    for (uid,) in assigned.all():
        by_learner.setdefault(uid, {"completed": 0, "upcoming": 0, "last": None, "next": None})

    if not by_learner:
        return {"learners": []}

    users = await db.execute(select(User).where(User.id.in_(by_learner.keys())))
    learners = []
    for u in users.scalars().all():
        agg = by_learner[u.id]
        learners.append({
            "id": u.id,
            "name": u.full_name,
            "level": u.proficiency_level.value if u.proficiency_level else "Not set",
            "nativeLanguage": u.native_language,
            "avatarUrl": u.avatar_url,
            "completed": agg["completed"],
            "upcoming": agg["upcoming"],
            "lastCompletedAt": to_utc_iso(agg["last"]) if agg["last"] else None,
            "nextSessionAt": to_utc_iso(agg["next"]) if agg["next"] else None,
        })
    learners.sort(key=lambda x: (-(x["upcoming"] + x["completed"]), x["name"]))
    return {"learners": learners}


# — Schedule —

@router.get("/tutor/schedule")
async def tutor_schedule(
    days: int = Query(DEFAULT_SCHEDULE_DAYS, ge=1, le=365),
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Future scheduled sessions within `days`, soonest first."""
    now = utc_now()
    result = await db.execute(
        select(Class)
        .options(selectinload(Class.learner))
        .where(
            and_(
                Class.tutor_id == tutor.id,
                Class.status == ClassStatus.SCHEDULED,
                Class.scheduled_at >= now,
                Class.scheduled_at <= now + timedelta(days=days),
            )
        )
        .order_by(Class.scheduled_at.asc())
    )
    sessions = [
        {
            "id": c.id,
            "title": c.title,
            "learner": c.learner.full_name if c.learner else "Unknown",
            "startsAt": to_utc_iso(c.scheduled_at),
            "durationMinutes": c.duration_minutes,
        }
        for c in result.scalars().all()
    ]
    return {"sessions": sessions, "days": days}


# — Lesson Notes —

@router.get("/tutor/notes")
async def tutor_notes(
    limit: int = Query(100, ge=1, le=500),
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Completed lessons, newest first, carrying the feedback written at completion."""
    result = await db.execute(
        select(Class)
        .options(selectinload(Class.learner))
        .where(Class.tutor_id == tutor.id, Class.status == ClassStatus.COMPLETED)
        .order_by(Class.scheduled_at.desc())
        .limit(limit)
    )
    return {
        "notes": [
            {
                "id": c.id,
                "title": c.title,
                "learner": c.learner.full_name if c.learner else "Unknown",
                "startsAt": to_utc_iso(c.scheduled_at),
                "notes": c.notes,
            }
            for c in result.scalars().all()
        ]
    }


# — Settings (profile) —

class AvailabilitySlot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    day_of_week: int = Field(..., ge=0, le=6, alias="dayOfWeek")
    start_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$", alias="startTime")
    end_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$", alias="endTime")
    timezone: str = Field(..., min_length=1, max_length=50)


class TutorProfilePatch(BaseModel):
    """Self-service editable fields only.

    rating / reviews_count / is_approved / years_experience / payout
    details are staff-owned - they are absent from this schema, so a
    tutor PATCH cannot touch them (same whitelist lesson as Step 3).
    """
    headline: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = None
    country: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = Field(None, max_length=50)
    native_language: Optional[str] = Field(None, max_length=50, alias="nativeLanguage")
    availability: Optional[List[AvailabilitySlot]] = None

    model_config = ConfigDict(populate_by_name=True)


async def _profile_or_404(tutor: User, db: AsyncSession) -> TutorProfile:
    result = await db.execute(
        select(TutorProfile)
        .options(selectinload(TutorProfile.availability))
        .where(TutorProfile.user_id == tutor.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    return profile


def _profile_out(tutor: User, profile: TutorProfile) -> dict:
    return {
        "id": profile.id,
        "email": tutor.email,
        "fullName": tutor.full_name,
        "headline": profile.headline,
        "bio": profile.bio,
        "country": profile.country,
        "timezone": tutor.timezone,
        "nativeLanguage": tutor.native_language,
        "yearsExperience": profile.years_experience,
        "rating": profile.rating,
        "reviewsCount": profile.reviews_count,
        "isApproved": profile.is_approved,
        "availability": [
            {
                "dayOfWeek": a.day_of_week,
                "startTime": a.start_time,
                "endTime": a.end_time,
                "timezone": a.timezone,
            }
            for a in sorted(profile.availability, key=lambda a: (a.day_of_week, a.start_time))
        ],
    }


@router.get("/tutor/profile")
async def get_tutor_profile(
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    profile = await _profile_or_404(tutor, db)
    return _profile_out(tutor, profile)


@router.patch("/tutor/profile")
async def patch_tutor_profile(
    payload: TutorProfilePatch,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    profile = await _profile_or_404(tutor, db)
    data = payload.model_dump(exclude_unset=True)

    if "headline" in data:
        profile.headline = data["headline"]
    if "bio" in data:
        profile.bio = data["bio"]
    if "country" in data:
        profile.country = data["country"]
    if "timezone" in data:
        tutor.timezone = data["timezone"]
    if "native_language" in data:
        tutor.native_language = data["native_language"]

    if "availability" in data:
        # The whole week is replaced, never merged: a partial-save UI must
        # not leave ghost windows behind.
        await db.execute(delete(TutorAvailability).where(TutorAvailability.profile_id == profile.id))
        for slot in data["availability"] or []:
            db.add(TutorAvailability(
                profile_id=profile.id,
                day_of_week=slot["day_of_week"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
                timezone=slot["timezone"],
            ))

    await db.commit()
    # Re-read with fresh availability (the deleted rows linger in the
    # relationship until the identity map is expired).
    await db.refresh(profile, ["availability"])
    return _profile_out(tutor, profile)
