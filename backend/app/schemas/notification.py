from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    notifications: list[NotificationRead]
    unread: int