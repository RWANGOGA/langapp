from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from math import ceil

from app.db.session import get_db
from app.models.tutor import Tutor, TutorSpecialty, TutorLanguage
from app.schemas.tutor import TutorRead, TutorListResponse, TutorCreate, TutorUpdate

router = APIRouter()


@router.get("/tutors", response_model=TutorListResponse)
async def get_tutors(
    specialty: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("rating", pattern="^(rating|reviews|experience|name)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tutor).options(selectinload(Tutor._specialties), selectinload(Tutor._languages))
    count_query = select(func.count(Tutor.id))

    if specialty:
        query = query.where(Tutor._specialties.any(TutorSpecialty.specialty == specialty))
        count_query = count_query.where(Tutor._specialties.any(TutorSpecialty.specialty == specialty))

    if language:
        query = query.where(Tutor._languages.any(TutorLanguage.language == language))
        count_query = count_query.where(Tutor._languages.any(TutorLanguage.language == language))

    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                Tutor.name.ilike(search_term),
                Tutor.headline.ilike(search_term),
                Tutor.bio.ilike(search_term),
            )
        )
        count_query = count_query.where(
            or_(
                Tutor.name.ilike(search_term),
                Tutor.headline.ilike(search_term),
                Tutor.bio.ilike(search_term),
            )
        )

    if sort == "rating":
        query = query.order_by(Tutor.rating.desc())
    elif sort == "reviews":
        query = query.order_by(Tutor.reviews.desc())
    elif sort == "experience":
        query = query.order_by(Tutor.years_experience.desc())
    elif sort == "name":
        query = query.order_by(Tutor.name.asc())

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    tutors = result.scalars().all()

    return TutorListResponse(
        tutors=[TutorRead.model_validate(t) for t in tutors],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/tutors/{tutor_id}", response_model=TutorRead)
async def get_tutor(tutor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tutor)
        .options(selectinload(Tutor._specialties), selectinload(Tutor._languages))
        .where(Tutor.id == tutor_id)
    )
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return TutorRead.model_validate(tutor)


@router.post("/tutors", response_model=TutorRead, status_code=201)
async def create_tutor(tutor_in: TutorCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tutor).where(Tutor.id == tutor_in.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tutor with this ID already exists")

    tutor = Tutor(**tutor_in.model_dump(exclude={"specialties", "languages"}))
    tutor.specialties = tutor_in.specialties
    tutor.languages = tutor_in.languages

    db.add(tutor)
    await db.commit()
    await db.refresh(tutor)
    return TutorRead.model_validate(tutor)


@router.patch("/tutors/{tutor_id}", response_model=TutorRead)
async def update_tutor(tutor_id: str, tutor_in: TutorUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tutor)
        .options(selectinload(Tutor._specialties), selectinload(Tutor._languages))
        .where(Tutor.id == tutor_id)
    )
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    update_data = tutor_in.model_dump(exclude_unset=True, exclude={"specialties", "languages"})
    for field, value in update_data.items():
        setattr(tutor, field, value)

    if tutor_in.specialties is not None:
        tutor.specialties = tutor_in.specialties
    if tutor_in.languages is not None:
        tutor.languages = tutor_in.languages

    await db.commit()
    await db.refresh(tutor)
    return TutorRead.model_validate(tutor)


@router.delete("/tutors/{tutor_id}", status_code=204)
async def delete_tutor(tutor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tutor).where(Tutor.id == tutor_id))
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    await db.delete(tutor)
    await db.commit()