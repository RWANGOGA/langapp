"""In-app lesson calls (LiveKit).

A lesson can run inside the product instead of bouncing out to Zoom/Meet.
The room is named deterministically from the class id (`class-{id}`) so both
the assigned learner and the assigned tutor resolve the same room without a
separate lookup. Tokens are minted server-side, scoped to that single room,
and short-lived - roughly the lesson length plus a grace window - so a leaked
token cannot be reused for a different class or held indefinitely.

Nothing here talks to LiveKit over the network: minting an access token is
pure signing, which keeps the endpoints testable without credentials.
"""
from datetime import timedelta

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings
from app.models.user import Class, User

ROOM_PREFIX = "class-"
# A token outlives the scheduled end by this much, so a lesson that runs long
# or starts a few minutes late is not dropped mid-call.
GRACE_MINUTES = 45


class CallsUnavailable(Exception):
    """Raised when an in-app call is requested but LiveKit is not configured."""


def room_name_for(cls: Class) -> str:
    """The room a class uses: the stored name, or the deterministic default."""
    return cls.room_name or f"{ROOM_PREFIX}{cls.id}"


def ensure_room(cls: Class) -> str:
    """Attach a deterministic room to the class if it has none, and return it."""
    if not cls.room_name:
        cls.room_name = f"{ROOM_PREFIX}{cls.id}"
    return cls.room_name


def mint_token(cls: Class, user: User) -> tuple[str, str, str]:
    """Return (url, room, token) for `user` joining `cls`'s room.

    Raises CallsUnavailable when the provider is not configured; the caller
    turns that into a 503 so the UI can fall back to an external link.
    """
    if not settings.calls_enabled:
        raise CallsUnavailable("In-app calls are not configured on this server")

    room = room_name_for(cls)
    identity = str(user.id)
    ttl = timedelta(minutes=cls.duration_minutes or 60) + timedelta(minutes=GRACE_MINUTES)

    token = (
        AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(user.full_name or identity)
        .with_grants(
            VideoGrants(
                room=room,
                room_join=True,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .with_ttl(ttl)
        .to_jwt()
    )
    return settings.LIVEKIT_URL, room, token
