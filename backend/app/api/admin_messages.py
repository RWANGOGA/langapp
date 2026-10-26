"""The staff half of the contact form.

Anyone can write in; only staff can read what was written. Two things are kept
here rather than being left to the interface:

- an answer is a stored fact, tied to the message, the person who wrote it and
  the moment they wrote it. "Handled" that names nobody cannot be checked by
  the next administrator on shift;
- a reply is delivered, not merely typed. If the sender turns out to hold an
  account, the answer lands in their notifications as well as on this page -
  until a sending service is configured, an email address typed into a form
  gives us exactly one way back to a stranger, and we take it when it exists.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.auth import require_admin
from app.core.time import to_utc_iso, utc_now
from app.db.session import get_db
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.schemas.contact import ContactInbox, ContactReply, ContactThread, InboxState
from app.services.notifications import notify_user

router = APIRouter()

Replier = aliased(User)


def _thread(row: ContactMessage, replied_by_name: str | None) -> ContactThread:
    return ContactThread(
        id=row.id,
        name=row.name,
        email=row.email,
        topic=row.topic,
        message=row.message,
        created_at=to_utc_iso(row.created_at),
        is_handled=row.is_handled,
        reply=row.reply,
        replied_at=to_utc_iso(row.replied_at) if row.replied_at else None,
        replied_by=row.replied_by,
        replied_by_name=replied_by_name,
    )


async def _one(db: AsyncSession, message_id: int) -> ContactMessage:
    row = await db.get(ContactMessage, message_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No message with that reference.")
    return row


@router.get("/messages", response_model=ContactInbox)
async def list_messages(
    state: InboxState = Query("all"),
    topic: str | None = Query(None, max_length=40),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """The queue, newest first, a page at a time.

    The counts are over everything, not over the page being returned: a filter
    that changed the number beside it would tell the reader the work had shrunk
    when only the view had. And the page is capped, because a school that grows
    should not have to carry every enquiry it ever received to read the newest.
    """
    conditions = []
    if state == "open":
        conditions.append(ContactMessage.is_handled.is_(False))
    elif state == "answered":
        conditions.append(ContactMessage.is_handled.is_(True))
    if topic:
        conditions.append(ContactMessage.topic == topic)

    rows = (
        await db.execute(
            select(ContactMessage, Replier.full_name)
            .outerjoin(Replier, Replier.id == ContactMessage.replied_by)
            .where(*conditions)
            .order_by(ContactMessage.created_at.desc(), ContactMessage.id.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    return ContactInbox(
        messages=[_thread(row, name) for row, name in rows],
        total=await db.scalar(
            select(func.count()).select_from(ContactMessage).where(*conditions)
        )
        or 0,
        open=await db.scalar(
            select(func.count()).select_from(ContactMessage).where(ContactMessage.is_handled.is_(False))
        )
        or 0,
        answered=await db.scalar(
            select(func.count()).select_from(ContactMessage).where(ContactMessage.is_handled.is_(True))
        )
        or 0,
    )


@router.post("/messages/{message_id}/reply", response_model=ContactThread)
async def reply_to_message(
    message_id: int,
    payload: ContactReply,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Answer one enquiry. Writing again revises the same answer.

    Marking it handled is part of replying rather than a second button: a queue
    where "answered" and "closed" are separate states is a queue where things
    get answered and never closed.
    """
    row = await _one(db, message_id)

    row.reply = payload.reply
    row.replied_at = utc_now()
    row.replied_by = current_user.id
    row.is_handled = True

    # One address, two possibilities: a person with an account, who can simply
    # be told, and a stranger, for whom the answer waits in this thread until
    # someone sends it from their own mail client.
    sender = await db.scalar(
        select(User).where(func.lower(User.email) == row.email.lower())
    )
    if sender:
        await notify_user(
            db,
            sender.id,
            "contact_reply",
            "Someone answered your question",
            f"Your message about {row.topic} has a reply from {current_user.full_name}:\n\n{payload.reply}",
        )
    await db.commit()
    await db.refresh(row)
    return _thread(row, current_user.full_name)


@router.post("/messages/{message_id}/reopen", response_model=ContactThread)
async def reopen_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Put a closed thread back on the queue.

    What was said stays on the record. A promise that turns out to have been
    wrong is only fixable if the person on shift can read what was promised.
    """
    row = await _one(db, message_id)
    row.is_handled = False
    await db.commit()
    await db.refresh(row)
    # The answer stays visible with the name that signed it, so reopening a
    # thread shows the next reader what was already promised.
    signed_by = await db.scalar(select(User.full_name).where(User.id == row.replied_by)) if row.replied_by else None
    return _thread(row, signed_by)
