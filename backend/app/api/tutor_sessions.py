"""Tutor session actions: meeting link, completion, lesson feedback.

These are the first real *write* actions a tutor can take on a class.
Every action is ownership-checked (a tutor may only touch their own
classes) and status-guarded, so the session state machine stays honest
as the lifecycle work builds on top of it.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.time import utc_now, to_utc_iso
from app.db.session import get_db
from app.models.user import Class, ClassStatus, User, UserRole
from app.schemas.tutor_sessions import (
    CancelRequest,
    FeedbackRequest,
    MeetingLinkRequest,
    SessionActionResponse,
)
from app.api.auth import get_current_user
from app.services.notifications import notify_user

router = APIRouter()


async def _require_tutor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can manage their sessions",
        )
    return current_user


async def _get_owned_class(
    class_id: int, tutor: User, db: AsyncSession
) -> Class:
    result = await db.execute(
        select(Class).where(Class.id == class_id, Class.tutor_id == tutor.id)
    )
    cls = result.scalar_one_or_none()
    if not cls:
        # 404, not 403: never confirm to another tutor that the class exists.
        raise HTTPException(status_code=404, detail="Session not found")
    return cls


def _respond(cls: Class) -> SessionActionResponse:
    return SessionActionResponse(
        class_id=cls.id,
        status=cls.status,
        starts_at=to_utc_iso(cls.scheduled_at),
        zoom_url=cls.zoom_url,
        meet_url=cls.meet_url,
        notes=cls.notes,
        updated_at=to_utc_iso(cls.updated_at or utc_now()),
    )


@router.post("/tutor/sessions/{class_id}/meeting-link", response_model=SessionActionResponse)
async def set_meeting_link(
    class_id: int,
    payload: MeetingLinkRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Attach a tutor-created meeting URL to an upcoming class."""
    cls = await _get_owned_class(class_id, tutor, db)
    if cls.status != ClassStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot add a meeting link to a '{cls.status.value}' session",
        )

    url = str(payload.url)
    if payload.provider == "zoom":
        cls.zoom_url = url
    else:
        cls.meet_url = url

    await db.commit()
    await db.refresh(cls)
    return _respond(cls)


@router.post("/tutor/sessions/{class_id}/complete", response_model=SessionActionResponse)
async def complete_session(
    class_id: int,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Mark a scheduled session as completed - the event progress is built on."""
    cls = await _get_owned_class(class_id, tutor, db)
    if cls.status != ClassStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is '{cls.status.value}', only 'scheduled' sessions can be completed",
        )

    cls.status = ClassStatus.COMPLETED
    await db.commit()
    await db.refresh(cls)
    return _respond(cls)


@router.post("/tutor/sessions/{class_id}/feedback", response_model=SessionActionResponse)
async def write_feedback(
    class_id: int,
    payload: FeedbackRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Save lesson notes for the session and notify the learner.

    Notes are stored as JSON on Class.notes so the learner dashboard can
    render topic/feedback/written_at separately instead of a blob.
    """
    cls = await _get_owned_class(class_id, tutor, db)
    if cls.status in (ClassStatus.CANCELLED, ClassStatus.NO_SHOW):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot write feedback for a '{cls.status.value}' session",
        )

    entry = {
        "topic": payload.topic or cls.title,
        "feedback": payload.feedback.strip(),
        "written_by": tutor.id,
        "written_at": to_utc_iso(utc_now()),
    }
    cls.notes = json.dumps(entry)

    await notify_user(
        db,
        cls.learner_id,
        "lesson_feedback",
        f"New lesson feedback: {entry['topic']}",
        entry["feedback"],
    )

    await db.commit()
    await db.refresh(cls)
    return _respond(cls)


@router.post("/tutor/sessions/{class_id}/cancel", response_model=SessionActionResponse)
async def cancel_session(
    class_id: int,
    payload: CancelRequest,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Tutor cancels an upcoming session; the learner is notified."""
    cls = await _get_owned_class(class_id, tutor, db)
    if cls.status != ClassStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is '{cls.status.value}', only 'scheduled' sessions can be cancelled",
        )

    cls.status = ClassStatus.CANCELLED
    starts = to_utc_iso(cls.scheduled_at)
    reason_line = f" Reason: {payload.reason.strip()}" if payload.reason else ""
    await notify_user(
        db,
        cls.learner_id,
        "class_cancelled",
        f"Class cancelled: {cls.title}",
        f"{tutor.full_name} cancelled your class (scheduled at {starts} UTC).{reason_line}",
    )

    await db.commit()
    await db.refresh(cls)
    return _respond(cls)


@router.post("/tutor/sessions/{class_id}/no-show", response_model=SessionActionResponse)
async def mark_no_show(
    class_id: int,
    tutor: User = Depends(_require_tutor),
    db: AsyncSession = Depends(get_db),
):
    """Tutor marks a learner absent - only once the start time has passed."""
    cls = await _get_owned_class(class_id, tutor, db)
    if cls.status != ClassStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is '{cls.status.value}', only 'scheduled' sessions can be marked no-show",
        )
    if cls.scheduled_at > utc_now():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The session has not started yet - it cannot be a no-show",
        )

    cls.status = ClassStatus.NO_SHOW
    await notify_user(
        db,
        cls.learner_id,
        "class_no_show",
        f"Marked as no-show: {cls.title}",
        f"{tutor.full_name} recorded a no-show for your class scheduled at "
        f"{to_utc_iso(cls.scheduled_at)} UTC. Contact your tutor if this is a mistake.",
    )

    await db.commit()
    await db.refresh(cls)
    return _respond(cls)
