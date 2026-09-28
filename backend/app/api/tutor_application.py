from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from math import ceil

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.tutor_application import TutorApplication, ApplicationStatus
from app.schemas.tutor_application import (
    TutorApplicationCreate, TutorApplicationUpdate, TutorApplicationStatusUpdate,
    TutorApplicationRead, TutorApplicationListResponse
)
from app.api.auth import get_current_active_user, require_admin

router = APIRouter()


@router.post("/tutor/applications", response_model=TutorApplicationRead, status_code=status.HTTP_201_CREATED)
async def submit_application(
    application_in: TutorApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can apply to become tutors")

    existing = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Application already exists")

    step1 = application_in.step1
    step2 = application_in.step2
    step3 = application_in.step3
    step4 = application_in.step4
    step5 = application_in.step5
    step6 = application_in.step6
    step7 = application_in.step7
    step8 = application_in.step8

    application = TutorApplication(
        user_id=current_user.id,
        full_name=step1.full_name,
        country=step1.country,
        date_of_birth=step1.date_of_birth,
        id_verification_provider=step2.id_verification_provider if step2 else None,
        id_verification_id=step2.id_verification_id if step2 else None,
        qualification_type=step2.qualification_type if step2 else None,
        qualification_file_url=str(step2.qualification_file_url) if step2 and step2.qualification_file_url else None,
        english_proof_type=step3.english_proof_type if step3 else None,
        english_score=step3.english_score if step3 else None,
        intro_video_url=str(step4.intro_video_url) if step4 and step4.intro_video_url else None,
        years_experience=step4.years_experience if step4 else 0,
        specialties=",".join(step5.specialties) if step5 and step5.specialties else "",
        languages=",".join(step5.languages) if step5 and step5.languages else "",
        availability_json=step6.availability if step6 else None,
        tech_confirmed=step7.tech_confirmed if step7 else True,
        code_of_conduct_accepted=step7.code_of_conduct_accepted if step7 else True,
        privacy_agreement_accepted=step7.privacy_agreement_accepted if step7 else True,
        recording_consent=step7.recording_consent if step7 else True,
        reference_1_name=step8.reference_1_name if step8 else None,
        reference_1_email=step8.reference_1_email if step8 else None,
        reference_2_name=step8.reference_2_name if step8 else None,
        reference_2_email=step8.reference_2_email if step8 else None,
        background_check_provider=step8.background_check_provider if step8 else None,
    )
    db.add(application)

    current_user.role = UserRole.TUTOR
    await db.commit()
    await db.refresh(application)
    return application


@router.get("/tutor/applications/me", response_model=TutorApplicationRead)
async def get_my_application(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="No application found")
    return application


@router.patch("/tutor/applications/me", response_model=TutorApplicationRead)
async def update_my_application(
    application_in: TutorApplicationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TutorApplication).where(TutorApplication.user_id == current_user.id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="No application found")
    if application.status not in [ApplicationStatus.SUBMITTED, ApplicationStatus.DOCUMENTS_REVIEW]:
        raise HTTPException(status_code=400, detail="Cannot update application in current status")

    update_data = application_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["specialties", "languages"] and isinstance(value, list):
            setattr(application, field, ",".join(value))
        else:
            setattr(application, field, value)

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

    application.status = review_in.status
    if review_in.admin_notes is not None:
        application.admin_notes = review_in.admin_notes
    if review_in.demo_lesson_score is not None:
        application.demo_lesson_score = review_in.demo_lesson_score
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()

    if review_in.status == ApplicationStatus.APPROVED:
        application.is_approved = True
        application.approved_at = datetime.utcnow()
        application.approved_by = current_user.id

        user_result = await db.execute(select(User).where(User.id == application.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.role = UserRole.TUTOR

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