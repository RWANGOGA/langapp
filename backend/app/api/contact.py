from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.contact_message import ContactMessage
from app.schemas.contact import ContactMessageCreate
from app.services.notifications import notify_admins

router = APIRouter()


@router.post("/contact", status_code=status.HTTP_201_CREATED)
async def send_contact_message(
    payload: ContactMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Take a message from the public contact page.

    Deliberately open: a person who cannot sign in is exactly the person who
    needs to reach us. The message is stored, and every admin gets an in-app
    notification carrying the sender's address so the reply can leave by mail.
    """
    message = ContactMessage(
        name=payload.name,
        email=payload.email,
        topic=payload.topic,
        message=payload.message,
    )
    db.add(message)
    await notify_admins(
        db,
        notification_type="contact_message",
        title=f"New message from {payload.name}",
        message=f"{payload.email} · {payload.topic}\n\n{payload.message}",
    )
    await db.commit()
    return {"ok": True}
