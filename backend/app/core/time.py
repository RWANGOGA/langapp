"""Time helpers - the single convention point for the whole backend.

Storage convention: datetime columns are *naive UTC* (set via utc_now()).
Never use datetime.now() / date.today() for server logic - those follow the
machine's local clock and break for a globally deployed app.

API convention: every instant leaves the API as an explicit UTC ISO string
("+00:00") via to_utc_iso(), so the browser can render the user's local time.
"""
from datetime import datetime, timezone


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
