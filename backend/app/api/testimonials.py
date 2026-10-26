"""The public wall of testimonials.

Reads are open to anyone; writing needs an account, because the whole value of
a testimonial is that a named, real person stands behind it. Two consequences
follow, and both are enforced here rather than in the interface:

- the name and the identity (learner or tutor) come from the account, never from
  the request body;
- an administrator cannot post praise about their own school.
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.auth import get_current_active_user
from app.db.session import get_db
from app.models.testimonial import Testimonial, TestimonialKind
from app.models.user import TutorProfile, User, UserRole
from app.schemas.testimonial import TestimonialList, TestimonialRead, TestimonialWrite
from app.services.notifications import notify_admins

router = APIRouter()


def _read(row: Testimonial) -> TestimonialRead:
    return TestimonialRead(
        id=str(row.id),
        name=row.author_name,
        kind=row.author_kind,
        region=row.author_region,
        quote=row.quote,
        is_pilot_note=row.is_pilot_note,
        created_at=row.created_at,
    )


async def _mine(db: AsyncSession, user: User) -> Testimonial | None:
    return await db.scalar(select(Testimonial).where(Testimonial.user_id == user.id))


@router.get("/testimonials", response_model=TestimonialList)
async def list_testimonials(db: AsyncSession = Depends(get_db)):
    """Everything on the wall, newest first.

    Uncached by the caller: a school that quotes its students has to be able to
    take one down and have it gone, not gone in five minutes.
    """
    rows = (
        await db.scalars(select(Testimonial).order_by(Testimonial.created_at.desc(), Testimonial.id.desc()))
    ).all()
    items = [_read(row) for row in rows]
    return TestimonialList(testimonials=items, total=len(items))


@router.get("/testimonials/mine", response_model=TestimonialRead | None)
async def read_my_testimonial(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """The caller's own entry, or null - the dashboard panel starts from nothing."""
    row = await _mine(db, current_user)
    return _read(row) if row else None


@router.put("/testimonials/mine", response_model=TestimonialRead)
async def write_my_testimonial(
    payload: TestimonialWrite,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or edit the one testimonial this account owns.

    PUT because there is exactly one per person: writing again revises what is
    already on the wall instead of stacking a second copy of the same name.
    """
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Testimonials come from the people learning and teaching here.",
        )

    kind = TestimonialKind.LEARNER
    if current_user.role == UserRole.TUTOR:
        # Only an approved tutor may be introduced as one. Anyone else with the
        # role is mid-onboarding and has not taught here yet.
        approved = await db.scalar(
            select(TutorProfile.is_approved).where(TutorProfile.user_id == current_user.id)
        )
        if not approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tutors can write a testimonial once their profile is approved.",
            )
        kind = TestimonialKind.TUTOR

    row = await _mine(db, current_user)
    if row is None:
        row = Testimonial(
            user_id=current_user.id,
            author_name=current_user.full_name.strip(),
            author_kind=kind,
            author_region=payload.region,
            quote=payload.quote,
            is_pilot_note=False,
        )
        db.add(row)
        await notify_admins(
            db,
            notification_type="testimonial_written",
            title=f"New testimonial from {row.author_name}",
            message=f"{row.author_kind.value} · {payload.region or 'no location given'}\n\n{payload.quote}",
        )
    else:
        # The name and identity stay as they were first written: the account may
        # have changed since, but the sentence was said by that person, then.
        row.quote = payload.quote
        row.author_region = payload.region
    await db.commit()
    await db.refresh(row)
    return _read(row)


@router.delete("/testimonials/mine", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_my_testimonial(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Take your own words down. No appeal, no review, no waiting."""
    row = await _mine(db, current_user)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no testimonial on the wall.")
    await db.delete(row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
