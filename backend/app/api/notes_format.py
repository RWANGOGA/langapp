"""Unwrap a stored Class.notes value into what a reader should see.

The feedback endpoint writes JSON ({"topic", "feedback", "written_by",
"written_at"}); rows written before that format hold plain text. Either way
the client gets prose - never a storage string.
"""
import json
from typing import Optional


def unwrap_notes(raw: Optional[str]) -> dict:
    empty = {"topic": None, "notes": None, "writtenAt": None}
    if not raw:
        return empty
    try:
        entry = json.loads(raw)
    except (TypeError, ValueError):
        return {**empty, "notes": raw}
    if not isinstance(entry, dict):
        return {**empty, "notes": raw}
    feedback = entry.get("feedback")
    return {
        "topic": entry.get("topic"),
        "notes": feedback if isinstance(feedback, str) and feedback else None,
        "writtenAt": entry.get("written_at"),
    }
