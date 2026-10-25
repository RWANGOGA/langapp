"""
What an applicant is allowed to learn about their own application.

``test_application_security.py`` closed the write hole: an applicant can no
longer PATCH reviewer-owned attestations onto themselves. The read side is
the mirror of that hole, and it is still open - ``/tutor/applications/me``
answers with ``TutorApplicationRead``, which is the *staff* schema. It carries
``admin_notes``: the free-text comment a reviewer writes about the applicant,
not to them.

So the applicant's own request hands them the internal file on themselves,
and the apply form - which renders whatever PATCH returns - would put it in
the browser too.

The second half of this file is the other half of the same journey: after
someone finishes eight steps of onboarding they are sent back to
/tutor/requirements, a page that still advertises "Start my application".
Nothing tells them the application arrived, who has it now, or when they will
hear again. ``/me/status`` answers that, and only with facts the record
already holds.
"""
import pytest
from datetime import datetime

from tests.sqlite_fixtures import db_session, learner_user, make_client  # noqa: F401
from app.models.tutor_application import (
    TutorApplication,
    ApplicationStatus,
    VerificationStatus,
)
from app.schemas.tutor_application import TutorApplicationApplicantRead

ME = "/api/v1/tutor/applications/me"
STATUS = "/api/v1/tutor/applications/me/status"

# Notes and the identity of the person who wrote them belong to the review
# file. A score, a timestamp and the verification outcomes are the applicant's
# own results and stay visible to them.
REVIEWER_PRIVATE = {"admin_notes", "reviewed_by"}

INTERNAL_NOTE = "References could not be reached. Do not approve without a call."


@pytest.fixture
def reviewed_application(learner_user):
    """A submitted application carrying a reviewer's private note about it."""
    return TutorApplication(
        user_id=learner_user.id,
        status=ApplicationStatus.DOCUMENTS_REVIEW,
        full_name="Test Learner",
        country="Kenya",
        id_verification_status=VerificationStatus.PENDING,
        background_check_status=VerificationStatus.PENDING,
        admin_notes=INTERNAL_NOTE,
        reviewed_by=99,
    )


class TestApplicantReadSurface:
    def test_the_applicant_schema_has_no_reviewer_fields(self):
        """Structural guard, so an endpoint edit cannot re-open this."""
        leaked = REVIEWER_PRIVATE & set(TutorApplicationApplicantRead.model_fields)
        assert not leaked, f"applicant schema exposes reviewer fields: {leaked}"

    @pytest.mark.asyncio
    async def test_reading_my_application_does_not_return_internal_notes(
        self, db_session, learner_user, reviewed_application  # noqa: F811
    ):
        db_session.add(reviewed_application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.get(ME)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "admin_notes" not in body, "the applicant received the internal file on themselves"
        assert "reviewed_by" not in body
        assert INTERNAL_NOTE not in str(body)

    @pytest.mark.asyncio
    async def test_saving_a_draft_does_not_echo_internal_notes(
        self, db_session, learner_user, reviewed_application  # noqa: F811
    ):
        """The apply form renders the response of its own save call."""
        db_session.add(reviewed_application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json={"years_experience": 4})
        assert r.status_code == 200, r.text
        assert "admin_notes" not in r.json()
        assert r.json()["years_experience"] == 4

    @pytest.mark.asyncio
    async def test_the_applicant_still_sees_their_own_results(
        self, db_session, learner_user, reviewed_application  # noqa: F811
    ):
        """Restricting the view must not turn it into a blank page."""
        reviewed_application.demo_lesson_score = 78
        db_session.add(reviewed_application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = (await applicant.get(ME)).json()
        assert body["status"] == "documents_review"
        assert body["full_name"] == "Test Learner"
        assert body["id_verification_status"] == "pending"
        assert body["demo_lesson_score"] == 78

    @pytest.mark.asyncio
    async def test_staff_still_see_the_review_file(
        self, db_session, learner_user, reviewed_application  # noqa: F811
    ):
        """The note is not deleted - it stops being public to its subject."""
        from app.models.user import User, UserRole

        admin = User(
            email="admin.review@example.com",
            hashed_password="x",
            full_name="Reviewing Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db_session.add(admin)
        await db_session.commit()
        db_session.add(reviewed_application)
        await db_session.commit()

        async with make_client(db_session, admin) as staff:
            r = await staff.get(f"/api/v1/tutor/applications/{reviewed_application.id}")
        assert r.status_code == 200, r.text
        assert r.json()["admin_notes"] == INTERNAL_NOTE


def saved(db_session, learner_user, **overrides):
    """An application owned by the learner, ready to be added to a session.

    Every field the submit gate asks for is filled, because "has this been
    submitted" is decided by exactly those rules - a fixture missing them
    would be testing the draft path by accident.
    """
    fields = dict(
        user_id=learner_user.id,
        status=ApplicationStatus.SUBMITTED,
        current_step=8,
        full_name="Test Learner",
        country="Kenya",
        id_verification_provider="Kenya National ID",
        id_verification_id="12345678",
        id_document_url="https://files.example/id.jpg",
        id_verification_status=VerificationStatus.PENDING,
        qualification_type="TEFL",
        qualification_file_url="https://files.example/tefl.pdf",
        qualification_verified=False,
        english_proof_type="IELTS",
        english_score="8.0",
        english_proof_url="https://files.example/ielts.pdf",
        english_verified=False,
        intro_video_url="https://youtu.example/intro",
        years_experience=4,
        specialties="Conversation,Business English",
        languages="English,Swahili",
        availability_json='{"mon":[9,12]}',
        tech_confirmed=True,
        code_of_conduct_accepted=True,
        privacy_agreement_accepted=True,
        recording_consent=True,
        reference_1_name="A. Referee",
        reference_1_email="ref@example.com",
        background_check_status=VerificationStatus.PENDING,
        admin_notes=INTERNAL_NOTE,
        reviewed_by=99,
    )
    fields.update(overrides)
    application = TutorApplication(**fields)
    return application


async def status_of(client) -> dict:
    response = await client.get(STATUS)
    assert response.status_code == 200, response.text
    return response.json()


class TestApplicantStatus:
    """Where the application stands, and whose ball it is in."""

    @pytest.mark.asyncio
    async def test_nobody_has_applied_yet(self, db_session, learner_user):  # noqa: F811
        """No row is a normal state of this journey, not a missing resource -
        the page has to render it without an error banner."""
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["has_application"] is False
        assert body["waiting_on"] == "you"
        assert body["action_required"], "a page for someone who has not applied must say what to do"

    @pytest.mark.asyncio
    async def test_a_part_application_names_the_finish_line(self, db_session, learner_user):  # noqa: F811
        db_session.add(
            saved(db_session, learner_user, current_step=3, intro_video_url=None, availability_json=None)
        )
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["submitted"] is False
        assert body["waiting_on"] == "you", "an unfinished form is not waiting on anyone else"
        assert body["action_required"]

    @pytest.mark.asyncio
    async def test_a_submitted_application_is_with_the_school(
        self, db_session, learner_user  # noqa: F811
    ):
        db_session.add(saved(db_session, learner_user))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["submitted"] is True
        assert body["waiting_on"] == "school"
        assert body["action_required"] is None, (
            "nothing is owed by the applicant while staff hold the file")

    @pytest.mark.asyncio
    async def test_the_rail_is_the_published_process(
        self, db_session, learner_user  # noqa: F811
    ):
        """One screen cannot describe two different processes: the stages on
        the status rail must be the stages the requirements page promises."""
        db_session.add(saved(db_session, learner_user))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
            published = (await applicant.get("/api/v1/tutor/requirements")).json()
        assert [s["key"] for s in body["stages"]] == [
            s["key"] for s in published["review_stages"]
        ]
        assert [s["title"] for s in body["stages"]] == [
            s["title"] for s in published["review_stages"]
        ]
        # What each stage means travels with it: a rail that only names the
        # stages would send the applicant back to the marketing page to find
        # out what "English assessment" involves.
        assert [s["description"] for s in body["stages"]] == [
            s["description"] for s in published["review_stages"]
        ]

    @pytest.mark.asyncio
    async def test_an_earned_stage_is_marked_complete(
        self, db_session, learner_user  # noqa: F811
    ):
        db_session.add(saved(db_session, learner_user, status=ApplicationStatus.DEMO_LESSON))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        states = {s["key"]: s["state"] for s in body["stages"]}
        assert states["documents_review"] == "complete"
        assert states["english_test"] == "complete"
        assert states["demo_lesson"] == "current"
        assert states["approved"] == "upcoming"

    @pytest.mark.asyncio
    async def test_a_rejected_document_calls_the_action_back(
        self, db_session, learner_user  # noqa: F811
    ):
        """Review is not one-way: when evidence fails, the next move is the
        applicant's, and the page must stop saying 'we will be in touch'."""
        db_session.add(
            saved(
                db_session,
                learner_user,
                status=ApplicationStatus.DOCUMENTS_REVIEW,
                id_verification_status=VerificationStatus.FAILED,
            )
        )
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["waiting_on"] == "you"
        assert body["action_required"]
        failed = {c["id"]: c["state"] for c in body["checks"]}
        assert failed["identity"] == "failed"

    @pytest.mark.asyncio
    async def test_approval_ends_at_the_portal(
        self, db_session, learner_user  # noqa: F811
    ):
        db_session.add(saved(db_session, learner_user, status=ApplicationStatus.APPROVED))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["waiting_on"] == "nobody"
        assert body["action_required"] is None
        assert {s["state"] for s in body["stages"]} == {"complete"}

    @pytest.mark.asyncio
    async def test_a_closed_file_does_not_invent_where_it_stopped(
        self, db_session, learner_user  # noqa: F811
    ):
        """Rejection can arrive from any stage and the record keeps only the
        outcome, so the rail is withheld rather than reconstructed."""
        db_session.add(
            saved(
                db_session,
                learner_user,
                status=ApplicationStatus.REJECTED,
                reviewed_at=datetime(2026, 10, 1, 9, 0, 0),
            )
        )
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert body["stages"] == []
        assert body["waiting_on"] == "nobody"
        assert body["can_reapply"] is True, (
            "the submit endpoint lets a rejected applicant apply again; "
            "the page should say so instead of leaving them at a wall")

    @pytest.mark.asyncio
    async def test_the_status_leaks_nothing_the_reviewer_wrote(
        self, db_session, learner_user  # noqa: F811
    ):
        db_session.add(saved(db_session, learner_user))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert INTERNAL_NOTE not in str(body)
        assert "admin_notes" not in body

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "application_status",
        [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.DOCUMENTS_REVIEW,
            ApplicationStatus.ENGLISH_TEST,
            ApplicationStatus.DEMO_LESSON,
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
        ],
    )
    async def test_the_call_to_action_and_the_waiting_party_never_disagree(
        self, db_session, learner_user, application_status  # noqa: F811
    ):
        """The invariant the page leans on: 'do this next' appears exactly
        when the applicant is the one holding the process."""
        db_session.add(saved(db_session, learner_user, status=application_status))
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            body = await status_of(applicant)
        assert (body["action_required"] is not None) == (body["waiting_on"] == "you"), body
