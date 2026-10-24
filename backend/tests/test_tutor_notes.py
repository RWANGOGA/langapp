"""Lesson-notes archive: the client gets prose, not storage format."""
import json

import pytest

from app.models.user import ClassStatus, TutorProfile
from tests.sqlite_fixtures import (  # noqa: F401
    db_session,
    tutor_user,
    learner_user,
    make_class,
    make_client,
)


async def _notes_for(db_session, tutor_user, learner_user, *, raw, status=ClassStatus.COMPLETED):
    db_session.add(TutorProfile(user_id=tutor_user.id, country="KE"))
    cls = make_class(tutor_user.id, learner_user.id, hours_from_now=-24)
    cls.status = status
    cls.notes = raw
    db_session.add(cls)
    await db_session.commit()
    await db_session.refresh(tutor_user, ["tutor_profile"])

    async with make_client(db_session, tutor_user) as ac:
        response = await ac.get("/api/v1/tutor/notes")
    assert response.status_code == 200
    return response.json()["notes"]


class TestTutorNotesArchive:
    @pytest.mark.asyncio
    async def test_structured_feedback_is_unwrapped(self, db_session, tutor_user, learner_user):
        raw = json.dumps(
            {
                "topic": "Conditionals review",
                "feedback": "Strong grasp of the second conditional; drill the third.",
                "written_by": tutor_user.id,
                "written_at": "2026-10-21T17:06:00+00:00",
            }
        )
        notes = await _notes_for(db_session, tutor_user, learner_user, raw=raw)

        assert len(notes) == 1
        entry = notes[0]
        assert entry["notes"] == "Strong grasp of the second conditional; drill the third."
        assert entry["topic"] == "Conditionals review"
        assert entry["writtenAt"] == "2026-10-21T17:06:00+00:00"
        assert "{" not in entry["notes"], "the archive must never show storage format"

    @pytest.mark.asyncio
    async def test_plain_text_notes_survive(self, db_session, tutor_user, learner_user):
        notes = await _notes_for(
            db_session, tutor_user, learner_user, raw="Wrote a drill on articles."
        )
        assert notes[0]["notes"] == "Wrote a drill on articles."
        assert notes[0]["topic"] is None

    @pytest.mark.asyncio
    async def test_missing_notes_report_nothing(self, db_session, tutor_user, learner_user):
        notes = await _notes_for(db_session, tutor_user, learner_user, raw=None)
        assert len(notes) == 1
        assert notes[0]["notes"] is None
        assert notes[0]["topic"] is None
