"""
Step 3 - security fixes, written red-first.

Two audit findings get locked down here:

1. ``PATCH /tutor/applications/me`` accepted every field of
   ``TutorApplicationUpdate``, including verification-owned ones
   (qualification_verified, english_verified, id_verification_status,
   background_check_status, admin_notes, demo_lesson_score). An applicant
   could PATCH themselves into a "verified, demo score 100" state and the
   admin review queue would read those as staff attestations.
   Fix: applicant-writable whitelist, enforced in the endpoint AND
   mirrored by removal from the schema (defence in depth).

2. ``create_admin.py`` hard-coded admin@langapp.com / admin123, printed the
   password, and executed on import. Fix: env-driven credentials with a
   pure, testable validator that refuses known defaults and weak passwords,
   and a __main__ guard so importing the module is inert.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.sqlite_fixtures import db_session, learner_user, make_client  # noqa: F401
from app.models.user import User
from app.models.tutor_application import (
    TutorApplication,
    ApplicationStatus,
    VerificationStatus,
)
from app.schemas.tutor_application import TutorApplicationUpdate


ME = "/api/v1/tutor/applications/me"

# Fields only a reviewer may ever set.
ADMIN_ONLY_FIELDS = {
    "id_verification_status",
    "qualification_verified",
    "english_verified",
    "background_check_status",
    "admin_notes",
    "demo_lesson_score",
    "status",
    "reviewed_by",
    "reviewed_at",
}


@pytest.fixture
def application(learner_user):
    """A complete-enough submitted application owned by the learner user."""
    return TutorApplication(
        user_id=learner_user.id,
        status=ApplicationStatus.SUBMITTED,
        full_name="Test Learner",
        country="Kenya",
        id_verification_status=VerificationStatus.PENDING,
        background_check_status=VerificationStatus.PENDING,
        qualification_verified=False,
        english_verified=False,
    )


@pytest.mark.asyncio
async def test_applicant_can_patch_own_application(
    db_session, learner_user, application  # noqa: F811
):
    """Sanity: the harness actually reaches the PATCH endpoint."""
    db_session.add(application)
    await db_session.commit()
    async with make_client(db_session, learner_user) as applicant:
        r = await applicant.patch(ME, json={"full_name": "Renamed Learner"})
    assert r.status_code == 200, r.text


class TestApplicantPatchWhitelist:
    @pytest.mark.asyncio
    async def test_cannot_self_certify_verification_flags(
        self, db_session, learner_user, application  # noqa: F811
    ):
        """The escalation itself: every admin-owned field must be inert."""
        db_session.add(application)
        await db_session.commit()
        payload = {
            "id_verification_status": "verified",
            "qualification_verified": True,
            "english_verified": True,
            "background_check_status": "verified",
            "admin_notes": "Self-declared: everything checks out.",
            "demo_lesson_score": 100,
        }
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json=payload)
            assert r.status_code == 200, r.text
            # Silent ignore (200 + unchanged) is the contract, not 4xx:
            # older clients legitimately send extra fields alongside edits.
        await db_session.refresh(application)
        assert application.id_verification_status == VerificationStatus.PENDING
        assert application.background_check_status == VerificationStatus.PENDING
        assert application.qualification_verified is False
        assert application.english_verified is False
        assert application.admin_notes is None
        assert application.demo_lesson_score is None

    @pytest.mark.asyncio
    async def test_cannot_self_approve_status(
        self, db_session, learner_user, application  # noqa: F811
    ):
        db_session.add(application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json={"status": "approved"})
            assert r.status_code == 200, r.text
        await db_session.refresh(application)
        assert application.status == ApplicationStatus.SUBMITTED

    @pytest.mark.asyncio
    async def test_legitimate_applicant_edits_still_apply(
        self, db_session, learner_user, application  # noqa: F811
    ):
        """The whitelist must not neuter the real draft-editing flow."""
        db_session.add(application)
        await db_session.commit()
        payload = {
            "full_name": "Rewritten Name",
            "country": "Uganda",
            "years_experience": 3,
            "specialties": ["Business English", "Exams"],
            "languages": ["English", "Swahili"],
            "reference_1_name": "A. Referee",
            "reference_1_email": "ref@example.com",
        }
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json=payload)
            assert r.status_code == 200, r.text
        await db_session.refresh(application)
        assert application.full_name == "Rewritten Name"
        assert application.country == "Uganda"
        assert application.years_experience == 3
        assert application.specialties == "Business English,Exams"
        assert application.languages == "English,Swahili"
        assert application.reference_1_name == "A. Referee"

    @pytest.mark.asyncio
    async def test_replacing_english_proof_resets_its_verification(
        self, db_session, learner_user, application  # noqa: F811
    ):
        """Reviewers' attestations must not survive the evidence they attest."""
        application.english_verified = True
        db_session.add(application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json={"english_score": "IELTS 8.0"})
            assert r.status_code == 200, r.text
        await db_session.refresh(application)
        assert application.english_score == "IELTS 8.0"
        assert application.english_verified is False

    @pytest.mark.asyncio
    async def test_non_editable_status_still_rejected(
        self, db_session, learner_user, application  # noqa: F811
    ):
        """Regression guard on the state machine around the whitelist."""
        application.status = ApplicationStatus.APPROVED
        db_session.add(application)
        await db_session.commit()
        async with make_client(db_session, learner_user) as applicant:
            r = await applicant.patch(ME, json={"full_name": "Sneaky"})
        assert r.status_code == 409

    def test_schema_exposes_no_reviewer_fields(self):
        """Structural guard: keep the schema honest if the endpoint drifts."""
        leaked = ADMIN_ONLY_FIELDS & set(TutorApplicationUpdate.model_fields)
        assert not leaked, f"TutorApplicationUpdate exposes reviewer fields: {leaked}"


class TestAdminBootstrapHardening:
    """create_admin.py must be inert on import and env-driven at runtime."""

    def test_import_is_inert(self):
        # Pre-fix this import ran asyncio.run(create_admin()) against Neon.
        import create_admin  # noqa: F401

    def test_missing_env_vars_are_refused(self):
        from create_admin import resolve_admin_credentials

        with pytest.raises(ValueError):
            resolve_admin_credentials({})
        with pytest.raises(ValueError):
            resolve_admin_credentials({"ADMIN_EMAIL": "a@b.com"})
        with pytest.raises(ValueError):
            resolve_admin_credentials({"ADMIN_PASSWORD": "s0me-long-random-one!"})

    def test_known_default_passwords_are_refused(self):
        from create_admin import resolve_admin_credentials

        for weak in ("admin123", "password1234", "changeme12345", "adminadmin12"):
            with pytest.raises(ValueError):
                resolve_admin_credentials({
                    "ADMIN_EMAIL": "ops@nile.app",
                    "ADMIN_PASSWORD": weak,
                })

    def test_short_passwords_are_refused(self):
        from create_admin import resolve_admin_credentials

        with pytest.raises(ValueError):
            resolve_admin_credentials({
                "ADMIN_EMAIL": "ops@nile.app",
                "ADMIN_PASSWORD": "short",
            })

    def test_valid_env_returns_credentials(self):
        from create_admin import resolve_admin_credentials

        email, password, name = resolve_admin_credentials({
            "ADMIN_EMAIL": "ops@nile.app",
            "ADMIN_PASSWORD": "Xk9#mV2$lp7!qR4w",
        })
        assert email == "ops@nile.app"
        assert password == "Xk9#mV2$lp7!qR4w"
        assert name  # a display name always comes back

    def test_name_override_is_respected(self):
        from create_admin import resolve_admin_credentials

        _, _, name = resolve_admin_credentials({
            "ADMIN_EMAIL": "ops@nile.app",
            "ADMIN_PASSWORD": "Xk9#mV2$lp7!qR4w",
            "ADMIN_FULL_NAME": "Nile Operations",
        })
        assert name == "Nile Operations"
