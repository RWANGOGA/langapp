"""
Public tutor-directory authenticity tests.

The marketing `/tutors` directory must describe the real teaching faculty —
User accounts whose TutorProfile is staff-approved — and nothing else. The
legacy `tutors` table (migration-seeded personas, e.g. "Sarah Johnson", plus
old test debris written against the production database) must never surface
through a public endpoint again.
"""
import itertools
from datetime import datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.main import app
from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.tutor import Tutor
from app.models.tutor_application import (
    ApplicationStatus,
    TutorApplication,
    VerificationStatus,
)
from app.models.user import (
    ProficiencyLevel,
    TutorAvailability,
    TutorProfile,
    TutorProfileLanguage,
    TutorProfileSpecialty,
    User,
    UserRole,
)

from tests.sqlite_fixtures import db_session  # noqa: F401  (fixture registration)

_EMAIL_SEQ = itertools.count(1)


async def _seed_tutor(
    db: AsyncSession,
    name: str,
    *,
    approved: bool = True,
    headline: str | None = None,
    country: str = "Kenya",
    bio: str | None = None,
    rating: float = 0.0,
    reviews: int = 0,
    years: int = 3,
    specialties=(),
    languages=(),
    slots=(),
    timezone: str = "Africa/Nairobi",
    qualification_type: str | None = None,
    qualification_verified: bool = False,
    english_proof_type: str | None = None,
    english_score: str | None = None,
    english_verified: bool = False,
) -> User:
    """Create a real tutor account: user + profile (+ evidence application)."""
    user = User(
        email=f"{name.lower().replace(' ', '.')}_{next(_EMAIL_SEQ)}@tutors.example.com",
        hashed_password="x",
        full_name=name,
        role=UserRole.TUTOR,
        is_active=True,
        timezone=timezone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    profile = TutorProfile(
        user_id=user.id,
        headline=headline,
        country=country,
        bio=bio,
        years_experience=years,
        rating=rating,
        reviews_count=reviews,
        is_approved=approved,
        approved_at=datetime.utcnow() if approved else None,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    for s in specialties:
        db.add(TutorProfileSpecialty(profile_id=profile.id, specialty=s))
    for l in languages:
        db.add(TutorProfileLanguage(profile_id=profile.id, language=l))
    for day, start, end in slots:
        db.add(
            TutorAvailability(
                profile_id=profile.id, day_of_week=day, start_time=start,
                end_time=end, timezone=timezone,
            )
        )
    if qualification_type or english_proof_type:
        db.add(TutorApplication(
            user_id=user.id,
            status=ApplicationStatus.APPROVED if approved else ApplicationStatus.UNDER_REVIEW,
            full_name=name,
            country=country,
            qualification_type=qualification_type,
            qualification_verified=qualification_verified,
            english_proof_type=english_proof_type,
            english_score=english_score,
            english_verified=english_verified,
        ))
    await db.commit()
    return user


async def _seed_fake_legacy_tutor(db: AsyncSession) -> None:
    """A row of the exact junk the seeded directory used to serve."""
    db.add(Tutor(
        id="sarah-johnson",
        name="Sarah Johnson",
        headline="Business English specialist",
        country="United Kingdom",
        rating=4.9,
        reviews=412,
        years_experience=7,
        bio="Persona from the original seed migration.",
    ))
    await db.commit()


def _public_client(db: AsyncSession) -> AsyncClient:
    """Directory endpoints are public; only get_db needs overriding."""
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest_asyncio.fixture
async def public_client(db_session):
    async with _public_client(db_session) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_directory_lists_only_approved_real_tutors(public_client, db_session):
    await _seed_tutor(db_session, "Ada Verified", rating=4.8, reviews=12,
                      specialties=["IELTS"], languages=["English", "Swahili"],
                      qualification_type="TEFL", qualification_verified=True)
    await _seed_tutor(db_session, "Brian Pending", approved=False)
    student = User(
        email="pure.student@tutors.example.com", hashed_password="x",
        full_name="Carl Learner", role=UserRole.STUDENT,
        proficiency_level=ProficiencyLevel.B1, is_active=True,
    )
    db_session.add(student)
    await db_session.commit()
    await _seed_fake_legacy_tutor(db_session)

    res = await public_client.get("/api/v1/tutors")
    assert res.status_code == 200
    body = res.json()
    names = [t["name"] for t in body["tutors"]]
    assert names == ["Ada Verified"], "directory must list only approved tutors"
    assert body["total"] == 1
    assert body["tutors"][0]["id"]  # a usable profile URL segment


@pytest.mark.asyncio
async def test_directory_carries_real_credentials(public_client, db_session):
    await _seed_tutor(
        db_session, "Ada Verified", headline="Exam prep with 12 years of runway",
        country="Kenya", rating=4.8, reviews=12, years=12,
        specialties=["IELTS", "Business"], languages=["English", "Swahili"],
    )

    res = await public_client.get("/api/v1/tutors")
    t = res.json()["tutors"][0]
    assert t["headline"] == "Exam prep with 12 years of runway"
    assert t["country"] == "Kenya"
    assert t["rating"] == pytest.approx(4.8)
    assert t["reviews"] == 12
    assert t["years_experience"] == 12
    assert sorted(t["specialties"]) == ["Business", "IELTS"]
    assert sorted(t["languages"]) == ["English", "Swahili"]


@pytest.mark.asyncio
async def test_directory_sorts_by_real_rating_then_name(public_client, db_session):
    await _seed_tutor(db_session, "Zara Lower", rating=4.6)
    await _seed_tutor(db_session, "Amia Higher", rating=4.9)
    await _seed_tutor(db_session, "Nia New", rating=0.0)

    res = await public_client.get("/api/v1/tutors")
    assert [t["name"] for t in res.json()["tutors"]] == ["Amia Higher", "Zara Lower", "Nia New"]


@pytest.mark.asyncio
async def test_evidence_shown_only_when_staff_verified(public_client, db_session):
    await _seed_tutor(db_session, "Qual Only",
                      qualification_type="CELTA", qualification_verified=True,
                      english_proof_type="IELTS", english_score="8.5", english_verified=False)
    await _seed_tutor(db_session, "Nothing Verified",
                      qualification_type="TEFL", qualification_verified=False,
                      english_proof_type=None, english_verified=False)

    res = await public_client.get("/api/v1/tutors")
    by_name = {t["name"]: t for t in res.json()["tutors"]}
    assert by_name["Qual Only"]["qualification_type"] == "CELTA"
    assert by_name["Qual Only"]["english_proof_type"] is None, (
        "an unverified English claim is an applicant assertion, not evidence"
    )
    assert by_name["Nothing Verified"]["qualification_type"] is None


@pytest.mark.asyncio
async def test_availability_is_a_human_summary(public_client, db_session):
    await _seed_tutor(db_session, "Ada Verified",
                      slots=[(1, "09:00", "12:00"), (3, "14:00", "18:00")])

    res = await public_client.get("/api/v1/tutors")
    availability = res.json()["tutors"][0]["availability"]
    assert "Mon 09:00-12:00" in availability
    assert "Wed 14:00-18:00" in availability


@pytest.mark.asyncio
async def test_detail_lookup_by_user_id(public_client, db_session):
    ada = await _seed_tutor(db_session, "Ada Verified")
    brian = await _seed_tutor(db_session, "Brian Pending", approved=False)
    await _seed_fake_legacy_tutor(db_session)

    res = await public_client.get(f"/api/v1/tutors/{ada.id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Ada Verified"

    assert (await public_client.get(f"/api/v1/tutors/{brian.id}")).status_code == 404
    assert (await public_client.get("/api/v1/tutors/sarah-johnson")).status_code == 404


@pytest.mark.asyncio
async def test_legacy_write_routes_are_gone(public_client, db_session):
    """Faculty is managed by the onboarding pipeline, not raw directory writes."""
    payload = {"id": "ghost", "name": "Ghost", "headline": "h", "country": "c",
               "rating": 5.0, "reviews": 1, "years_experience": 1}
    res = await public_client.post("/api/v1/tutors", json=payload)
    assert res.status_code in (404, 405)
    res = await public_client.patch("/api/v1/tutors/sarah-johnson", json={"name": "Renamed"})
    assert res.status_code in (404, 405)
    res = await public_client.delete("/api/v1/tutors/sarah-johnson")
    assert res.status_code in (404, 405)


# — The approval pipeline must publish via TutorProfile only —

_FULL_APP = dict(
    id_verification_provider="Onfido", id_verification_id="ID-9", id_document_url="https://x/id",
    qualification_type="TEFL", qualification_file_url="https://x/qual",
    english_proof_type="IELTS", english_score="8.5", english_proof_url="https://x/eng",
    intro_video_url="https://x/video",
    specialties="IELTS,Business", languages="English,Swahili",
    availability_json="weekday evenings",
    tech_confirmed=True, code_of_conduct_accepted=True,
    privacy_agreement_accepted=True, recording_consent=True,
    reference_1_name="Ref One", reference_1_email="ref@one.example",
)


@pytest.mark.asyncio
async def test_approval_publishes_without_legacy_row(db_session):
    admin = User(
        email="dir.admin@tutors.example.com", hashed_password="x",
        full_name="Dir Admin", role=UserRole.ADMIN, is_active=True,
    )
    applicant = User(
        email="dir.applicant@tutors.example.com", hashed_password="x",
        full_name="Dana Approved", role=UserRole.STUDENT,
        proficiency_level=ProficiencyLevel.C1, is_active=True,
    )
    db_session.add_all([admin, applicant])
    await db_session.commit()
    await db_session.refresh(applicant)

    application = TutorApplication(
        user_id=applicant.id, status=ApplicationStatus.SUBMITTED,
        full_name="Dana Approved", country="Uganda", **_FULL_APP,
    )
    db_session.add(application)
    await db_session.commit()

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = lambda: admin
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(
            f"/api/v1/tutor/applications/{application.id}", json={"status": "approved"},
        )
        assert res.status_code == 200, res.text

        # The approved tutor is instantly visible in the directory...
        listing = await ac.get("/api/v1/tutors")
        assert [t["name"] for t in listing.json()["tutors"]] == ["Dana Approved"]

        # ...without a copy ever touching the legacy tutors table.
        legacy = await db_session.scalar(select(func.count(Tutor.id)))
        assert legacy == 0, "approval must not project into the legacy table"
    app.dependency_overrides.clear()
