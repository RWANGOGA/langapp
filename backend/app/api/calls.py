"""In-app lesson call join.

One endpoint serves both participants: the assigned learner and the assigned
tutor exchange their session for a short-lived, room-scoped LiveKit token.
Anyone outside the two-party cast gets a 404 (we never confirm a class id
exists), a class with no room or a dead status gets a 409, and an unconfigured
server gets a 503 so the UI can honestly fall back to an external link.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import Class, ClassStatus, User
from app.schemas.tutor_sessions import CallResponse
from app.services.calls import CallsUnavailable, mint_token

router = APIRouter()

# Only a live, scheduled lesson has a room to enter.
_JOINABLE = {ClassStatus.SCHEDULED}


@router.get("/calls/config")
async def calls_config():
    """Public feature flag: does this server run in-app calls at all?

    The client hides the 'in-app room' affordance when this is false, so the
    product behaves exactly as it did before LiveKit was configured. Reading a
    boolean is not a capability leak, so this needs no auth.
    """
    return {"enabled": settings.calls_enabled}


@router.get("/sessions/{class_id}/call", response_model=CallResponse)
async def get_call_token(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await db.scalar(select(Class).where(Class.id == class_id))
    if not cls or current_user.id not in (cls.learner_id, cls.tutor_id):
        raise HTTPException(status_code=404, detail="Call not found")
    if not cls.room_name:
        raise HTTPException(status_code=409, detail="This lesson has no in-app room")
    if cls.status not in _JOINABLE:
        raise HTTPException(
            status_code=409,
            detail=f"Session is '{cls.status.value}', there is nothing to join",
        )

    try:
        url, room, token = mint_token(cls, current_user)
    except CallsUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return CallResponse(url=url, room=room, identity=str(current_user.id), token=token)
