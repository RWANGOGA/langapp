from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import joinedload, selectinload
from typing import List

from app.db.session import get_db
from app.core.time import to_utc_iso
from app.models.user import User, UserRole, Class, ClassStatus, ProficiencyLevel, TutorProfile
from app.models.tutor_application import ApplicationStatus, TutorApplication
from app.models.package import Package, Order, OrderStatus, PaymentMethod, PlanName
from app.api.auth import require_admin
from app.api.tutors import availability_summary
from app.schemas.admin import (
    StudentAssignmentRequest, 
    StudentAssignmentResponse,
    StudentUnassignResponse,
    AdminDashboardResponse
)
from app.models.notification import Notification
from app.services.notifications import notify_admins, notify_user

router = APIRouter()


def leader_name(full_name: str) -> str:
    """Shorten a full name to "Amara O." for the leaders list."""
    parts = full_name.split()
    if not parts:
        return full_name
    return f"{parts[0]} {parts[-1][0]}."


@router.post("/assign-student", response_model=StudentAssignmentResponse)
async def assign_student_to_tutor(
    assignment_data: StudentAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Assign a student to a tutor"""
    # Check if student exists and is a student
    student_result = await db.execute(
        select(User).where(User.id == assignment_data.student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="User is not a student")
    
    # Check if tutor exists and is a tutor with approved profile
    tutor_result = await db.execute(
        select(User)
        .options(selectinload(User.tutor_profile))
        .where(User.id == assignment_data.tutor_id)
    )
    tutor = tutor_result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    if tutor.role != UserRole.TUTOR:
        raise HTTPException(status_code=400, detail="User is not a tutor")
    
    if not tutor.tutor_profile or not tutor.tutor_profile.is_approved:
        raise HTTPException(status_code=400, detail="Tutor profile is not approved")
    
    # Moving a learner between approved tutors is a normal admin action - one
    # call, no window where the learner is unassigned. The previous tutor is
    # told the learner is no longer theirs.
    previous_tutor_id = student.tutor_id
    if previous_tutor_id and previous_tutor_id != assignment_data.tutor_id:
        previous_result = await db.execute(
            select(User).where(User.id == previous_tutor_id)
        )
        previous_tutor = previous_result.scalar_one_or_none()
        if previous_tutor:
            await notify_user(
                db, previous_tutor.id, "learner_unassigned", "A learner was reassigned",
                f"{student.full_name} is no longer assigned to you.",
            )

    student.tutor_id = assignment_data.tutor_id
    await notify_user(
        db, student.id, "tutor_assigned", "Your tutor has been assigned",
        f"{tutor.full_name} is now your Nile Language tutor.",
    )
    await notify_user(
        db, tutor.id, "learner_assigned", "A learner has been assigned to you",
        f"{student.full_name} is now one of your Nile Language learners.",
    )
    await notify_admins(
        db, "assignment_created", "Tutor assignment completed",
        f"{student.full_name} was assigned to {tutor.full_name}.",
    )
    await db.commit()
    await db.refresh(student)
    
    return StudentAssignmentResponse(
        student_id=student.id,
        student_name=student.full_name,
        tutor_id=tutor.id,
        tutor_name=tutor.full_name,
        assigned_at=datetime.utcnow(),
        assigned_by=current_user.id,
    )


@router.delete("/unassign-student/{student_id}", response_model=StudentUnassignResponse)
async def unassign_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Remove student assignment to tutor"""
    # Find student
    student_result = await db.execute(
        select(User)
        .options(selectinload(User.tutor_profile))
        .where(User.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="User is not a student")
    
    # Check if student is currently assigned
    if not student.tutor_id:
        raise HTTPException(status_code=400, detail="Student is not currently assigned to a tutor")
    
    # Get previous tutor info
    previous_tutor_id = student.tutor_id
    tutor_result = await db.execute(
        select(User).where(User.id == previous_tutor_id)
    )
    previous_tutor = tutor_result.scalar_one_or_none()
    previous_tutor_name = previous_tutor.full_name if previous_tutor else "Unknown"
    
    # Unassign student
    student.tutor_id = None
    await notify_user(
        db, student.id, "tutor_unassigned", "Your tutor assignment changed",
        f"Your assignment to {previous_tutor_name} was removed. An administrator will follow up with your next match.",
    )
    if previous_tutor:
        await notify_user(
            db, previous_tutor.id, "learner_unassigned", "A learner was unassigned",
            f"{student.full_name} is no longer assigned to you.",
        )
    await notify_admins(
        db, "assignment_removed", "Tutor assignment removed",
        f"{student.full_name} was unassigned from {previous_tutor_name}.",
    )
    await db.commit()
    await db.refresh(student)
    
    return StudentUnassignResponse(
        student_id=student.id,
        student_name=student.full_name,
        previous_tutor_id=previous_tutor_id,
        previous_tutor_name=previous_tutor_name,
        unassigned_at=datetime.utcnow(),
        unassigned_by=current_user.id,
    )


@router.get("/assignments", response_model=List[StudentAssignmentResponse])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all current student-tutor assignments"""
    # Get all students with their assigned tutors
    students_result = await db.execute(
        select(User)
        .options(
            selectinload(User.tutor_profile),
            selectinload(User.assigned_tutor)
        )
        .where(User.role == UserRole.STUDENT)
    )
    students = students_result.scalars().all()
    
    assignments = []
    for student in students:
        if student.tutor_id:
            assignments.append(StudentAssignmentResponse(
                student_id=student.id,
                student_name=student.full_name,
                tutor_id=student.tutor_id,
                tutor_name=student.assigned_tutor.full_name if student.assigned_tutor else "Unknown",
                assigned_at=datetime.utcnow(),  # Would need to track actual assignment time
                assigned_by=student.assigned_tutor.id if student.assigned_tutor else None,
            ))
    
    return assignments


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    upcoming = and_(Class.status == ClassStatus.SCHEDULED, Class.scheduled_at >= now)

    # Every headline number in one statement. A round trip to the database costs
    # a third of a second from here, so the panel asks once instead of seven
    # times: unread notifications, the four KPIs, and the two meeting providers.
    stats = (
        await db.execute(
            select(
                select(func.count(Notification.id))
                .where(Notification.recipient_id == current_user.id, Notification.is_read.is_(False))
                .scalar_subquery()
                .label("unread"),
                select(func.count(User.id))
                .where(User.role == UserRole.TUTOR)
                .scalar_subquery()
                .label("total_tutors"),
                # Active Students: students with at least one scheduled class.
                select(func.count(func.distinct(Class.learner_id)))
                .where(upcoming)
                .scalar_subquery()
                .label("active_students"),
                select(func.count(Class.id))
                .where(upcoming)
                .scalar_subquery()
                .label("scheduled_sessions"),
                # Learners with no tutor yet - the one number an administrator
                # acts on daily.
                select(func.count(User.id))
                .where(User.role == UserRole.STUDENT, User.tutor_id.is_(None), User.is_active)
                .scalar_subquery()
                .label("awaiting_tutor"),
                select(func.count(Class.id))
                .where(upcoming, Class.zoom_url.isnot(None))
                .scalar_subquery()
                .label("zoom_sessions"),
                select(func.count(Class.id))
                .where(upcoming, Class.meet_url.isnot(None))
                .scalar_subquery()
                .label("meet_sessions"),
                # Applications the school owes a decision on: any state before
                # a terminal one (approved / rejected / withdrawn). A rejected
                # file is waiting on the applicant, not us, so it is excluded.
                select(func.count(TutorApplication.id))
                .where(
                    TutorApplication.status.in_(
                        [
                            ApplicationStatus.SUBMITTED,
                            ApplicationStatus.DOCUMENTS_REVIEW,
                            ApplicationStatus.ENGLISH_TEST,
                            ApplicationStatus.DEMO_LESSON,
                        ]
                    )
                )
                .scalar_subquery()
                .label("applications_in_review"),
            )
        )
    ).one()

    # Tutors with their details. Joined rather than fetched per relationship:
    # each extra query is another third of a second on the wire.
    tutors_result = await db.execute(
        select(User)
        .where(User.role == UserRole.TUTOR)
        .options(
            joinedload(User.tutor_profile).selectinload(TutorProfile.availability),
            joinedload(User.tutor_application),
        )
        .limit(20)
    )
    tutors = tutors_result.scalars().all()

    # Get tutor statuses based on their profile approval and assignments.
    # One grouped count feeds both the roster and the leaders list: asking per
    # tutor cost a round trip each, and this endpoint opens on every visit.
    assignment_counts_result = await db.execute(
        select(User.id, User.full_name, func.count(Class.id))
        .join(Class, Class.tutor_id == User.id)
        .where(User.role == UserRole.TUTOR, upcoming)
        .group_by(User.id, User.full_name)
    )
    assignment_rows = assignment_counts_result.all()
    assignments_by_tutor = {tutor_id: count for tutor_id, _, count in assignment_rows}

    tutors_data = []
    for t in tutors:
        assignment_count = assignments_by_tutor.get(t.id, 0)

        # Determine status
        if not t.tutor_profile or not t.tutor_profile.is_approved:
            status = "Onboarding"
        elif assignment_count > 0:
            status = "Assigned"
        else:
            status = "Active"

        tutors_data.append({
            "id": str(t.id),
            "name": t.full_name,
            "email": t.email,
            "status": status,
            # The profile stores the tutor's country, not the languages they
            # teach; claiming "English" when the profile is empty invented a fact.
            "country": t.tutor_profile.country if t.tutor_profile else None,
            "rating": t.tutor_profile.rating if t.tutor_profile else 0.0,
            "assignments": assignment_count,
            "qualification_type": t.tutor_application.qualification_type if t.tutor_application else None,
            "english_proof_type": t.tutor_application.english_proof_type if t.tutor_application else None,
            "english_score": t.tutor_application.english_score if t.tutor_application else None,
            "intro_video_url": t.tutor_profile.intro_video_url if t.tutor_profile else None,
            "availability": availability_summary(t.tutor_profile) if t.tutor_profile else None,
            "onboarding_fee_usd": 0,
        })

    students_result = await db.execute(
        select(User)
        .where(User.role == UserRole.STUDENT, User.is_active)
        .options(joinedload(User.assigned_tutor))
        .order_by(User.created_at.desc())
        .limit(50)
    )
    students = students_result.scalars().all()
    students_data = [
        {
            "id": student.id,
            "name": student.full_name,
            "email": student.email,
            "level": student.proficiency_level.value if student.proficiency_level else "Not set",
            "tutor_name": student.assigned_tutor.full_name if student.assigned_tutor else None,
            "status": "Assigned" if student.tutor_id else "Awaiting tutor",
        }
        for student in students
    ]

    learner_names = [student.full_name for student in students]
    # Matrix shows each tutor against the real learner roster.
    matrix = []
    for t in tutors[:10]:  # Limit to 10 tutors for matrix
        cells = ["assigned" if student.tutor_id == t.id else "empty" for student in students]

        matrix.append({
            "tutor": t.full_name,
            "cells": cells,
        })

    # Meetings - providers come from the scheduled classes counted above.
    zoom_count, meet_count = stats.zoom_sessions, stats.meet_sessions

    meetings = []
    if zoom_count > 0:
        meetings.append({"provider": "Zoom", "sessions": [], "connected": True})
    if meet_count > 0:
        meetings.append({"provider": "Google Meet", "sessions": [], "connected": True})
    if zoom_count == 0 and meet_count == 0:
        # Default if no scheduled classes
        meetings = [
            {"provider": "Zoom", "sessions": [], "connected": False},
            {"provider": "Google Meet", "sessions": [], "connected": False},
        ]

    # Get upcoming sessions for meetings panel
    upcoming_sessions_result = await db.execute(
        select(Class)
        .where(
            upcoming,
            Class.scheduled_at <= now + timedelta(hours=24),
        )
        .options(joinedload(Class.learner), joinedload(Class.tutor))
        .order_by(Class.scheduled_at)
        .limit(10)
    )
    upcoming_sessions = upcoming_sessions_result.scalars().all()

    for session in upcoming_sessions[:5]:
        learner_name = session.learner.full_name if session.learner else "Unknown"
        time_str = session.scheduled_at.strftime("%H:%M")
        # Determine provider from actual class data
        if session.zoom_url:
            provider = "Zoom"
        elif session.meet_url:
            provider = "Google Meet"
        else:
            provider = "Zoom"  # Default fallback
        # Find or create meeting entry
        for m in meetings:
            if m["provider"] == provider:
                m["sessions"].append(f"{learner_name} - {session.title}, {time_str}")
                break
        else:
            # Provider not in meetings list, add it
            meetings.append({"provider": provider, "sessions": [f"{learner_name} - {session.title}, {time_str}"], "connected": True})

    # Plans distribution from orders
    plans_result = await db.execute(
        select(Package.name, func.count(Order.id))
        .select_from(Package)
        .outerjoin(Order, Order.package_id == Package.id)
        .group_by(Package.id, Package.name)
    )
    plans_data = plans_result.all()

    # Calculate total orders for percentage
    total_orders = sum(count for _, count in plans_data) or 1
    plans = [
        {
            "name": name,
            "share": round((count / total_orders) * 100),
            "color": "var(--navy)" if name == "Starter" else "var(--teal)" if name == "Intensive" else "#f47a52",
        }
        for name, count in plans_data
    ]

    # Top leaders reuse the same aggregate: the busiest tutor on the roster is
    # by definition the one with the most upcoming sessions.
    leaders = [
        {"name": leader_name(full_name), "value": count}
        for _, full_name, count in sorted(assignment_rows, key=lambda row: row[2], reverse=True)[:5]
    ]

    # Activity log (recent completed classes, new orders, new tutors)
    activity = []
    
    # Recent completed classes
    completed_classes = await db.execute(
        select(Class)
        .where(Class.status == ClassStatus.COMPLETED)
        .options(joinedload(Class.learner), joinedload(Class.tutor))
        .order_by(Class.updated_at.desc())
        .limit(5)
    )
    for c in completed_classes.scalars().all():
        tutor_name = c.tutor.full_name if c.tutor else "Tutor"
        activity.append({
            "id": f"act_{c.id}",
            "initial": "T",
            "text": f"{tutor_name} session completed",
            # When the lesson was closed out, not when this payload was built.
            "at": to_utc_iso(c.updated_at) if c.updated_at else None,
        })

    # Recent orders
    recent_orders = await db.execute(
        select(Order)
        .options(joinedload(Order.user))
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    for o in recent_orders.scalars().all():
        user_name = o.user.full_name if o.user else "Student"
        activity.append({
            "id": f"act_order_{o.id}",
            "initial": "S",
            "text": f"{user_name} payment confirmed",
            "at": to_utc_iso(o.created_at) if o.created_at else None,
        })

    # Status counts for subscription management - from actual order statuses
    order_statuses_result = await db.execute(
        select(Order.status, func.count(Order.id))
        .group_by(Order.status)
    )
    order_statuses_data = order_statuses_result.all()
    
    status_color_map = {
        "pending": "var(--coral)",
        "confirmed": "var(--teal)",
        "processing": "var(--navy)",
        "completed": "var(--teal)",
        "cancelled": "#d64545",
        "refunded": "#f3b04a",
        "failed": "#d64545",
    }
    
    statuses = []
    for status, count in order_statuses_data:
        statuses.append({
            "label": status.capitalize() if status else "Unknown",
            "count": count,
            "color": status_color_map.get(status.value if hasattr(status, 'value') else status, "var(--navy)")
        })
    
    # If no order statuses, provide defaults
    if not statuses:
        statuses = [
            {"label": "Active", "count": 0, "color": "var(--teal)"},
            {"label": "Pending", "count": 0, "color": "var(--coral)"},
        ]

    return {
        "unread": stats.unread,
        "applications_in_review": stats.applications_in_review,
        "kpis": [
            {"label": "Total Tutors", "value": str(stats.total_tutors)},
            {"label": "Active Students", "value": str(stats.active_students)},
            {"label": "Scheduled Sessions", "value": str(stats.scheduled_sessions)},
            {"label": "Awaiting a tutor", "value": str(stats.awaiting_tutor)},
        ],
        "tutors": tutors_data,
        "students": students_data,
        "student_names": learner_names,
        "matrix": matrix,
        "meetings": [
            {"provider": m["provider"], "sessions": m["sessions"], "connected": m["connected"]}
            for m in meetings
        ],
        "plans": plans,
        "leaders": leaders,
        "activity": activity[:10],
        "statuses": statuses,
    }
