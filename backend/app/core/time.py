"""Time helpers - the single convention point for the whole backend.

Storage convention: datetime columns are *naive UTC* (set via utc_now()).
Never use datetime.now() / date.today() for server logic - those follow the
machine's local clock and break for a globally deployed app.

API convention: every instant leaves the API as an explicit UTC ISO string
("+00:00") via to_utc_iso(), so the browser can render the user's local time.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def utc_now() -> datetime:
    """Current time as naive UTC, matching how datetime columns are stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_iso(dt: datetime) -> str:
    """Render a stored naive-UTC datetime as an explicit UTC ISO instant.

    >>> to_utc_iso(datetime(2026, 10, 24, 15, 0))
    '2026-10-24T15:00:00+00:00'
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()


def normalize_zone(value: str | None) -> str | None:
    """Validate a user-supplied IANA timezone name.

    Returns the trimmed zone, or None when nothing was given - leaving the field
    blank is an honest "not sure yet", not an error. A name the tz database does
    not know raises ValueError instead of being stored: a made-up zone silently
    moves every time rendered from it, and any zone chosen at sign-up lives on
    in whatever the matching engine later compares it against.
    """
    zone = (value or "").strip()
    if not zone:
        return None
    try:
        ZoneInfo(zone)
    except (KeyError, ZoneInfoNotFoundError) as exc:
        raise ValueError(
            f"Unknown timezone '{zone}'. Use an IANA name like Asia/Tokyo."
        ) from exc
    return zone
