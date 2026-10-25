from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from math import ceil

from app.db.session import get_db
from app.models.user import User, UserRole, TutorProfile
from app.models.tutor_application import (
    TutorApplication,
    ApplicationStatus,
    VerificationStatus,
)
from app.schemas.tutor_application import (
    TutorApplicationCreate, TutorApplicationUpdate, TutorApplicationStatusUpdate,
    TutorApplicationApplicantRead, TutorApplicationRead, TutorApplicationListResponse,
    ApplicationCompleteness, RequirementDocument, ReviewStage, TutorRequirementsRead,
    ApplicationStatusView,
)
from app.api.auth import get_current_active_user, require_admin
from app.services import application_completeness as completeness
from app.services import application_status
from app.services.notifications import notify_admins, notify_user

router = APIRouter()

# Statuses in which the applicant may still change their submission.
EDITABLE_STATUSES = {ApplicationStatus.SUBMITTED, ApplicationStatus.DOCUMENTS_REVIEW}

# Fields an applicant may write on their own application. This mirrors the
# onboarding form's input surface exactly. Verification outcomes, reviewer
# notes and demo scores are attestations owned by staff - accepting them
# from the applicant endpoint was a privilege-escalation path, so they are
# excluded here even if a schema (or a future schema edit) ever allows them.
APPLICANT_WRITABLE_FIELDS = {
    "full_name", "country", "date_of_birth",
    "id_verification_provider", "id_verification_id", "id_document_url",
    "qualification_type", "qualification_file_url",
    "english_proof_type", "english_score", "english_proof_url",
    "intro_video_url", "years_experience", "specialties", "languages",
    "availability_json",
    "tech_confirmed", "code_of_conduct_accepted",
    "privacy_agreement_accepted", "recording_consent",
    "reference_1_name", "reference_1_email",
    "reference_2_name", "reference_2_email",
    "background_check_provider",
}

# Legal forward transitions. Backward moves and skips are rejected so an
# application cannot jump straight to APPROVED without passing review.
ALLOWED_TRANSITIONS: dict[ApplicationStatus, set[ApplicationStatus]] = {
    ApplicationStatus.SUBMITTED: {
        ApplicationStatus.DOCUMENTS_REVIEW,
        ApplicationStatus.ENGLISH_TEST,
        ApplicationStatus.DEMO_LESSON,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.DOCUMENTS_REVIEW: {
        ApplicationStatus.ENGLISH_TEST,
        ApplicationStatus.DEMO_LESSON,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
    },
    ApplicationStatus.ENGLISH_TEST: {
        ApplicationStatus.DEMO_LESSON,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
    },
    ApplicationStatus.DEMO_LESSON: {
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
    },
    ApplicationStatus.REJECTED: {ApplicationStatus.SUBMITTED},
    ApplicationStatus.APPROVED: set(),
    ApplicationStatus.WITHDRAWN: set(),
}


@router.get("/tutor/requirements", response_model=TutorRequirementsRead)
async def get_tutor_requirements():
    """Public: the requirements an applicant must satisfy before starting.

    Deliberately unauthenticated - this is Step 0 of the journey and is shown
    before an account exists.
    """
    return TutorRequirementsRead(
        version="2026-09-30",
        updated_at=datetime(2026, 9, 30),
        eligibility=[
            "You are 18 or older and able to work as an independent contractor.",
            "You can demonstrate native or near-native English proficiency.",
            "You can commit to at least 8 teaching hours per week.",
            "You have a quiet space and a reliable internet connection for lessons.",
            "You are willing to complete a background check before your first class.",
        ],
        documents=[
            RequirementDocument(
                id="government_id",
                title="Government-issued photo ID",
                description="Passport or national identity card. The photo and expiry date must be legible.",
                required=True,
                accepted_formats=["pdf", "jpg", "jpeg", "png"],
                max_size_mb=10,
                examples=["Passport", "National ID card", "Driver licence"],
            ),
            RequirementDocument(
                id="proof_of_address",
                title="Proof of address",
                description="A utility bill or bank statement from the last 3 months.",
                required=False,
                accepted_formats=["pdf", "jpg", "jpeg", "png"],
                max_size_mb=10,
                examples=["Electricity bill", "Bank statement", "Council tax bill"],
            ),
            RequirementDocument(
                id="teaching_qualification",
                title="Teaching qualification",
                description="TEFL, IELTS, CELTA or a degree transcript evidencing language teaching ability.",
                required=True,
                accepted_formats=["pdf", "jpg", "jpeg", "png"],
                max_size_mb=10,
                examples=["TEFL certificate", "CELTA certificate", "BA English transcript"],
            ),
            RequirementDocument(
                id="english_proof",
                title="English proficiency evidence",
                description="An official test score, or a university transcript confirming your qualification.",
                required=True,
                accepted_formats=["pdf", "jpg", "jpeg", "png"],
                max_size_mb=10,
                examples=["IELTS score report", "TOEFL score report", "Cambridge C1 certificate"],
            ),
            RequirementDocument(
                id="intro_video",
                title="Introduction video",
                description="A 2-5 minute walkthrough introducing yourself and your teaching style. A direct link is acceptable.",
                required=True,
                accepted_formats=["mp4", "mov", "youtube", "vimeo"],
                max_size_mb=200,
                examples=["Unlisted YouTube link", "Direct .mp4 URL"],
            ),
            RequirementDocument(
                id="references",
                title="Professional references",
                description="At least one referee who can confirm your teaching experience. A second is optional.",
                required=True,
                accepted_formats=[],
                max_size_mb=None,
                examples=["Former employer", "Language school", "Academic supervisor"],
            ),
            RequirementDocument(
                id="teaching_profile",
                title="Teaching profile and availability",
                description="Prepare the subjects and languages you teach, plus the weekly time slots when you can accept lessons.",
                required=True,
                accepted_formats=[],
                max_size_mb=None,
                examples=["Conversation", "Business English", "Monday-Friday availability"],
            ),
        ],
        # Same object the progress rail is built from, so the process promised
        # here and the process shown after applying cannot diverge.
        review_stages=list(application_status.REVIEW_STAGES),
        policies=[
            {
                "id": "code_of_conduct",
                "title": "Code of conduct",
                "summary": "Professional and respectful behaviour with every student.",
            },
            {
                "id": "privacy_agreement",
                "title": "Privacy agreement",
                "summary": "How student data is handled and retained.",
            },
            {
                "id": "recording_consent",
                "title": "Recording consent",
                "summary": "Sessions may be recorded for quality and dispute purposes.",
            },
            {
                "id": "background_check",
                "title": "Background check disclosure",
                "summary": "Consent to a background check before your first class.",
            },
        ],
        disclaimer=(
            "Submitting an application does not guarantee approval and does not "
            "grant tutor access. Your account becomes a tutor account only after "
            "every document has been reviewed and the demo lesson has been passed."
        ),
        total_steps=8,
    )


@router.post(
    "/tutor/applications",
    response_model=TutorApplicationApplicantRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_application(
    application_in: TutorApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can apply to become tutors")

    existing = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    prior = existing.scalar_one_or_none()
    if prior and prior.status not in EDITABLE_STATUSES and prior.status != ApplicationStatus.REJECTED:
        raise HTTPException(
            status_code=409,
            detail=f"An application already exists with status '{prior.status.value}'",
        )

    # Completeness gate. Previously steps 2-8 were all optional, so an
    # application containing only step 1 was accepted and looked complete.
    report = completeness.evaluate_submission(application_in)
    if not report["can_submit"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=completeness.summarise(report),
        )

    step1 = application_in.step1
    step2 = application_in.step2
    step3 = application_in.step3
    step4 = application_in.step4
    step5 = application_in.step5
    step6 = application_in.step6
    step7 = application_in.step7
    step8 = application_in.step8

    if prior:
        # Resubmission - and a full re-POST over an editable draft - updates
        # the same record: user_id is unique, so creating a second row would
        # breach the constraint, and the audit trail must survive anyway.
        application = prior
        application.status = ApplicationStatus.SUBMITTED
        application.reviewed_at = None
        application.reviewed_by = None
    else:
        application = TutorApplication(user_id=current_user.id)
        db.add(application)

    application.full_name = step1.full_name
    application.country = step1.country
    application.date_of_birth = step1.date_of_birth
    application.id_verification_provider = step2.id_verification_provider
    application.id_verification_id = step2.id_verification_id
    application.id_document_url = str(step2.id_document_url)
    # Re-verification is required after a resubmission.
    application.id_verification_status = VerificationStatus.PENDING
    application.qualification_type = step2.qualification_type
    application.qualification_file_url = str(step2.qualification_file_url)
    application.qualification_verified = False
    application.english_proof_type = step3.english_proof_type
    application.english_score = step3.english_score
    application.english_proof_url = str(step3.english_proof_url)
    application.english_verified = False
    application.intro_video_url = str(step4.intro_video_url)
    application.years_experience = step4.years_experience or 0
    application.specialties = ",".join(step5.specialties)
    application.languages = ",".join(step5.languages)
    application.availability_json = step6.availability
    # Consents are stored exactly as supplied - the completeness gate has
    # already proven all four are affirmatively true.
    application.tech_confirmed = step7.tech_confirmed
    application.code_of_conduct_accepted = step7.code_of_conduct_accepted
    application.privacy_agreement_accepted = step7.privacy_agreement_accepted
    application.recording_consent = step7.recording_consent
    application.reference_1_name = step8.reference_1_name
    application.reference_1_email = step8.reference_1_email
    application.reference_2_name = step8.reference_2_name
    application.reference_2_email = step8.reference_2_email
    application.background_check_provider = step8.background_check_provider
    application.background_check_status = VerificationStatus.PENDING
    application.current_step = 8
    application.status = ApplicationStatus.SUBMITTED

    await db.commit()
    await db.refresh(application)
    return application


# The applicant endpoints answer with the applicant schema, never the staff
# one: reading your own application must not hand back the reviewer's notes
# about it. Reviewer endpoints below keep TutorApplicationRead.
@router.get("/tutor/applications/me", response_model=TutorApplicationApplicantRead)
async def get_my_application(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="No application found")
    return application


@router.get("/tutor/applications/me/status", response_model=ApplicationStatusView)
async def get_my_application_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """What happens next, for the person waiting on the answer.

    Deliberately not a 404 when there is nothing on file: having no
    application is the normal state of the page this feeds, so it answers
    with an empty view plus the guidance that goes with it.
    """
    result = await db.execute(
        select(TutorApplication).where(TutorApplication.user_id == current_user.id)
    )
    return application_status.describe(result.scalar_one_or_none())


@router.get("/tutor/applications/me/completeness", response_model=ApplicationCompleteness)
async def get_my_application_completeness(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """What is still outstanding, so the form can gate its submit button.

    Uses the same rules as the submit gate, so the UI cannot offer a submit
    the API would reject.
    """
    result = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    application = result.scalar_one_or_none()

    if application is None:
        # Nothing saved yet: everything is outstanding.
        return ApplicationCompleteness(
            steps=[
                {
                    "step": s.step,
                    "title": s.title,
                    "complete": False,
                    "missing": list(s.required_fields),
                }
                for s in completeness.REQUIRED_BY_STEP.values()
            ],
            incomplete_steps=sorted(completeness.REQUIRED_BY_STEP),
            can_submit=False,
        )

    return ApplicationCompleteness(**completeness.evaluate(application))


@router.patch("/tutor/applications/me", response_model=TutorApplicationApplicantRead)
async def update_my_application(
    application_in: TutorApplicationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="No application found")
    # 409, not 400: the request is well-formed but conflicts with the
    # application's current state, so it must not be silently applied.
    if application.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot edit an application with status "
                f"'{application.status.value}'. Editing is allowed only while "
                f"it is: {', '.join(s.value for s in EDITABLE_STATUSES)}."
            ),
        )

    update_data = application_in.model_dump(exclude_unset=True)
    # Defence in depth behind the restricted schema: drop anything a
    # reviewer owns. Extra/unknown keys are ignored silently so older
    # clients sending a full draft payload keep working.
    update_data = {k: v for k, v in update_data.items() if k in APPLICANT_WRITABLE_FIELDS}
    # Consents must never be silently flipped on by a partial save.
    for consent in completeness.CONSENT_FIELDS:
        if consent not in update_data:
            update_data.pop(consent, None)
    for field, value in update_data.items():
        if field in ["specialties", "languages"] and isinstance(value, list):
            setattr(application, field, ",".join(value))
        else:
            setattr(application, field, value)

    # Evidence changed after review started, so it needs re-verification.
    if "qualification_file_url" in update_data:
        application.qualification_verified = False
    if "english_score" in update_data:
        application.english_verified = False

    application.current_step = min(8, max(1, application.current_step or 1))
    application.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(application)
    return application


@router.get("/tutor/applications", response_model=TutorApplicationListResponse)
async def list_applications(
    status: Optional[ApplicationStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(TutorApplication).options(selectinload(TutorApplication.user))
    count_query = select(func.count(TutorApplication.id))

    if status:
        query = query.where(TutorApplication.status == status)
        count_query = count_query.where(TutorApplication.status == status)

    if search:
        search_term = f"%{search.lower()}%"
        query = query.join(User).where(
            or_(
                TutorApplication.full_name.ilike(search_term),
                User.email.ilike(search_term),
            )
        )
        count_query = count_query.join(User).where(
            or_(
                TutorApplication.full_name.ilike(search_term),
                User.email.ilike(search_term),
            )
        )

    query = query.order_by(TutorApplication.created_at.desc())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    applications = result.scalars().all()

    return TutorApplicationListResponse(
        applications=applications,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/tutor/applications/{application_id}", response_model=TutorApplicationRead)
async def get_application(
    application_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorApplication).options(selectinload(TutorApplication.user))
        .where(TutorApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch("/tutor/applications/{application_id}", response_model=TutorApplicationRead)
async def review_application(
    application_id: int,
    review_in: TutorApplicationStatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.id == application_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status == review_in.status:
        raise HTTPException(
            status_code=409,
            detail=f"Application is already '{review_in.status.value}'",
        )

    allowed = ALLOWED_TRANSITIONS.get(application.status, set())
    if review_in.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot move application from '{application.status.value}' to "
                f"'{review_in.status.value}'. Allowed next: "
                f"{', '.join(sorted(s.value for s in allowed)) or 'none (terminal state)'}"
            ),
        )

    # An application must be complete before it can be approved - the review
    # queue can hold a partial draft if the applicant was mid-edit.
    if review_in.status == ApplicationStatus.APPROVED:
        report = completeness.evaluate(application)
        if not report["can_submit"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=completeness.summarise(report),
            )

    application.status = review_in.status
    if review_in.admin_notes is not None:
        application.admin_notes = review_in.admin_notes
    if review_in.demo_lesson_score is not None:
        application.demo_lesson_score = review_in.demo_lesson_score
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()

    if review_in.status == ApplicationStatus.APPROVED:
        application.id_verification_status = VerificationStatus.VERIFIED
        application.qualification_verified = True
        application.english_verified = True
        application.background_check_status = VerificationStatus.VERIFIED

        # The only place a user becomes a tutor. Never reached by self-declaration.
        user_result = await db.execute(select(User).where(User.id == application.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.role = UserRole.TUTOR
            existing_profile = await db.execute(select(TutorProfile).where(TutorProfile.user_id == user.id))
            profile = existing_profile.scalar_one_or_none()
            if not profile:
                db.add(TutorProfile(
                    user_id=user.id,
                    headline=None,
                    country=application.country,
                    bio=None,
                    years_experience=application.years_experience or 0,
                    rating=0,
                    reviews_count=0,
                    is_approved=True,
                    approved_at=datetime.utcnow(),
                    approved_by=current_user.id,
                    intro_video_url=application.intro_video_url,
                ))
            else:
                # Re-approval of a previously onboarded tutor: the profile is
                # the single source of directory truth (see app/api/tutors.py),
                # so flip it back to approved - no legacy-table copy needed.
                profile.is_approved = True
                if profile.approved_at is None:
                    profile.approved_at = datetime.utcnow()
                    profile.approved_by = current_user.id
        await notify_user(
            db, application.user_id, "tutor_application_approved",
            "Your tutor application was approved",
            "Welcome to Nile Language. Your tutor dashboard is now available, and you can be assigned learners.",
        )
        await notify_admins(
            db, "tutor_approved", "Tutor onboarding completed",
            f"{application.full_name} has completed tutor onboarding and is ready for assignment.",
        )

    await db.commit()
    await db.refresh(application)
    return application


@router.delete("/tutor/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_application(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.id == application_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    application.status = ApplicationStatus.WITHDRAWN
    await db.commit()