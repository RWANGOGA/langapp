"""Two promises behind the public /tutors page.

1. A TUTOR-role account that was never approved can still apply.
   Registration used to honour a client-supplied role, so accounts created
   before that hole was closed are TUTOR with an empty TutorProfile, no
   application and no approval: invisible in the directory, and — because
   POST /tutor/applications demanded the STUDENT role — locked out of the only
   route that could make them legitimate. The admin roster then showed three
   tutor accounts while the marketing page could only ever list one, and the
   two stranded people had no way to fix it themselves.

2. Approval publishes what the applicant actually wrote.
   The directory renders profile facts (country, years, intro video,
   specialties, languages). Until this fix nothing in the application ever
   wrote specialties or languages, so an approved tutor's card was blank and
   the goal filter had nothing real to filter on.
"""
import pytest
from sqlalchemy import func, select

from app.models.tutor_application import ApplicationStatus, TutorApplication
from app.models.user import (
    TutorProfile,
    TutorProfileLanguage,
    TutorProfileSpecialty,
    User,
    UserRole,
)

from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_user,
    db_session,
    learner_user,
    make_client,
    tutor_user,
)

APPLY = "/api/v1/tutor/applications"

# Everything the eight-step form requires, in the shape the form posts it.
FULL_APPLICATION = {
    "step1": {"full_name": "Namaalwa Catherine", "country": "Uganda"},
    "step2": {
        "id_verification_provider": "Onfido",
        "id_verification_id": "ID-4471",
        "id_document_url": "https://example.com/id.pdf",
        "qualification_type": "TEFL",
        "qualification_file_url": "https://example.com/tefl.pdf",
    },
    "step3": {
        "english_proof_type": "IELTS",
        "english_score": "8.0",
        "english_proof_url": "https://example.com/ielts.pdf",
    },
    "step4": {"intro_video_url": "https://example.com/intro.mp4", "years_experience": 6},
    "step5": {
        "specialties": ["Business English", "IELTS Prep", "IELTS Prep"],
        "languages": ["English", " Luganda "],
    },
    "step6": {"availability": "weekday evenings"},
    "step7": {
        "tech_confirmed": True,
        "code_of_conduct_accepted": True,
        "privacy_agreement_accepted": True,
        "recording_consent": True,
    },
    "step8": {"reference_1_name": "Ref One", "reference_1_email": "ref@one.example.com"},
}


async def _unapproved_tutor_profile(db) -> User:
    """The exact state the old registration hole left behind."""
    user = User(
        email="stranded.tutor@example.com",
        hashed_password="x",
        full_name="Stranded Tutor",
        role=UserRole.TUTOR,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    db.add(TutorProfile(user_id=user.id, rating=0, reviews_count=0, is_approved=False))
    await db.commit()
    return user


@pytest.mark.asyncio
async def test_an_unapproved_tutor_can_still_apply(db_session):
    stranded = await _unapproved_tutor_profile(db_session)

    async with make_client(db_session, stranded) as client:
        res = await client.post(APPLY, json=FULL_APPLICATION)

    assert res.status_code == 201, res.text
    application = await db_session.scalar(
        select(TutorApplication).where(TutorApplication.user_id == stranded.id)
    )
    assert application is not None
    assert application.status == ApplicationStatus.SUBMITTED


@pytest.mark.asyncio
async def test_an_approved_tutor_cannot_apply_again(db_session, tutor_user):
    """The unlock is for accounts that never onboarded, not a foot in the door."""
    db_session.add(
        TutorProfile(user_id=tutor_user.id, rating=4.9, reviews_count=3, is_approved=True)
    )
    await db_session.commit()

    async with make_client(db_session, tutor_user) as client:
        res = await client.post(APPLY, json=FULL_APPLICATION)

    assert res.status_code == 400
    assert "already" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_a_student_can_still_apply(db_session, learner_user):
    async with make_client(db_session, learner_user) as client:
        res = await client.post(APPLY, json=FULL_APPLICATION)

    assert res.status_code == 201, res.text


@pytest.mark.asyncio
async def test_approval_publishes_the_applicants_own_facts(db_session, admin_user):
    applicant = await _unapproved_tutor_profile(db_session)
    async with make_client(db_session, applicant) as client:
        res = await client.post(APPLY, json=FULL_APPLICATION)
    assert res.status_code == 201, res.text
    application = res.json()

    async with make_client(db_session, admin_user) as admin:
        res = await admin.patch(
            f"{APPLY}/{application['id']}", json={"status": "approved"}
        )
    assert res.status_code == 200, res.text

    profile = await db_session.scalar(
        select(TutorProfile).where(TutorProfile.user_id == applicant.id)
    )
    await db_session.refresh(profile)
    assert profile.is_approved is True
    assert profile.country == "Uganda"
    assert profile.years_experience == 6
    assert profile.intro_video_url == "https://example.com/intro.mp4"

    specialties = (
        await db_session.scalars(
            select(TutorProfileSpecialty.specialty).where(
                TutorProfileSpecialty.profile_id == profile.id
            )
        )
    ).all()
    assert sorted(specialties) == ["Business English", "IELTS Prep"], "duplicates dropped"

    languages = (
        await db_session.scalars(
            select(TutorProfileLanguage.language).where(
                TutorProfileLanguage.profile_id == profile.id
            )
        )
    ).all()
    assert sorted(languages) == ["English", "Luganda"], "whitespace trimmed"


@pytest.mark.asyncio
async def test_reapproval_keeps_the_profile_the_tutor_curated(db_session, admin_user):
    """A tutor who edited their card in Settings must not be reset by re-approval."""
    tutor = await _unapproved_tutor_profile(db_session)
    async with make_client(db_session, tutor) as client:
        res = await client.post(APPLY, json=FULL_APPLICATION)
    application = res.json()

    db_session.add(TutorProfileSpecialty(profile_id=(await db_session.scalar(
        select(TutorProfile).where(TutorProfile.user_id == tutor.id)
    )).id, specialty="Academic Writing"))
    await db_session.commit()

    async with make_client(db_session, admin_user) as admin:
        res = await admin.patch(
            f"{APPLY}/{application['id']}", json={"status": "approved"}
        )
    assert res.status_code == 200, res.text

    profile = await db_session.scalar(
        select(TutorProfile).where(TutorProfile.user_id == tutor.id)
    )
    count = await db_session.scalar(
        select(func.count(TutorProfileSpecialty.id)).where(
            TutorProfileSpecialty.profile_id == profile.id
        )
    )
    assert count == 1, "a profile that already lists specialties is left alone"
