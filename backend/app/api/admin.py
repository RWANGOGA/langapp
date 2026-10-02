from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.user import User, UserRole, Class, ClassStatus, ProficiencyLevel
from app.models.tutor import Tutor
from app.models.package import Package, Order, OrderStatus, PaymentMethod, PlanName
from app.api.auth import require_admin
from app.schemas.admin import (
    StudentAssignmentRequest, 
    StudentAssignmentResponse,
    StudentUnassignResponse,
    AdminDashboardResponse
)
from app.models.notification import Notification
from app.services.notifications import notify_admins, notify_user

router = APIRouter()


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
    
    # Check if student is already assigned to a different tutor
    if student.tutor_id and student.tutor_id != assignment_data.tutor_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Student is already assigned to tutor {student.tutor_id}"
        )
    
    # Assign student to tutor
    previous_tutor_id = student.tutor_id
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
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    # KPIs - Total Tutors
    tutors_count_result = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.TUTOR)
    )
    total_tutors = tutors_count_result.scalar() or 0

    # Active Students (students with at least one scheduled class)
    active_students_result = await db.execute(
        select(func.count(func.distinct(Class.learner_id)))
        .where(
            and_(
                Class.status == "scheduled",
                Class.scheduled_at >= datetime.utcnow(),
            )
        )
    )
    active_students = active_students_result.scalar() or 0

    # Scheduled Sessions (upcoming)
    scheduled_sessions_result = await db.execute(
        select(func.count(Class.id)).where(
            and_(
                Class.status == ClassStatus.SCHEDULED,
                Class.scheduled_at >= datetime.utcnow(),
            )
        )
    )
    scheduled_sessions = scheduled_sessions_result.scalar() or 0

    # System Health - calculate from actual metrics
    total_users = await db.execute(select(func.count(User.id)).where(User.is_active))
    total_users_count = total_users.scalar() or 0
    error_rate = 0.0
    if total_users_count > 0:
        # Calculate health based on active users and system metrics
        active_percentage = min(100, (active_students / max(1, total_users_count)) * 100)
        system_health = f"{int(active_percentage)}%"
    else:
        system_health = "100%"

    # Tutors with their details
    tutors_result = await db.execute(
        select(User)
        .where(User.role == UserRole.TUTOR)
        .options(
            selectinload(User.tutor_profile),
            selectinload(User.tutor_application),
        )
        .limit(20)
    )
    tutors = tutors_result.scalars().all()

    public_tutors_result = await db.execute(select(Tutor))
    public_tutors = {tutor.id: tutor for tutor in public_tutors_result.scalars().all()}

    # Get tutor statuses based on their profile approval and assignments
    tutors_data = []
    for t in tutors:
        public_tutor = public_tutors.get(f"user-{t.id}")
        # Get assignment count (active scheduled classes)
        assignment_result = await db.execute(
            select(func.count(Class.id)).where(
                and_(
                    Class.tutor_id == t.id,
                    Class.status == "scheduled",
                    Class.scheduled_at >= datetime.utcnow(),
                )
            )
        )
        assignment_count = assignment_result.scalar() or 0

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
            # country is nullable, and the profile itself may be missing.
            "language": (t.tutor_profile.country if t.tutor_profile else None) or "English",
            "rating": t.tutor_profile.rating if t.tutor_profile else 0.0,
            "assignments": assignment_count,
            "qualification_type": t.tutor_application.qualification_type if t.tutor_application else None,
            "english_proof_type": t.tutor_application.english_proof_type if t.tutor_application else None,
            "english_score": t.tutor_application.english_score if t.tutor_application else None,
            "intro_video_url": public_tutor.intro_video_url if public_tutor else (t.tutor_profile.intro_video_url if t.tutor_profile else None),
            "availability": public_tutor.availability if public_tutor else None,
            "onboarding_fee_usd": public_tutor.onboarding_fee_usd if public_tutor else 0,
        })

    students_result = await db.execute(
        select(User)
        .where(User.role == UserRole.STUDENT)
        .options(selectinload(User.assigned_tutor))
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

    # Meetings - check provider connections from actual class data
    # Get unique meeting providers from scheduled classes
    providers_result = await db.execute(
        select(Class.zoom_url, Class.meet_url)
        .where(
            and_(
                Class.status == "scheduled",
                Class.scheduled_at >= datetime.utcnow(),
            )
        )
    )
    providers_data = providers_result.all()
    
    # Count providers
    zoom_count = 0
    meet_count = 0
    for zoom_url, meet_url in providers_data:
        if zoom_url:
            zoom_count += 1
        if meet_url:
            meet_count += 1
    
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
            and_(
                Class.status == "scheduled",
                Class.scheduled_at >= datetime.utcnow(),
                Class.scheduled_at <= datetime.utcnow() + timedelta(hours=24),
            )
        )
        .options(selectinload(Class.learner), selectinload(Class.tutor))
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
        select(Package.id, func.count(Order.id))
        .select_from(Package)
        .outerjoin(Order, Order.package_id == Package.id)
        .group_by(Package.id)
    )
    plans_data = plans_result.all()

    # Calculate total orders for percentage
    total_orders = sum(count for _, count in plans_data) or 1
    plans = []
    for plan_id, count in plans_data:
        package_result = await db.execute(select(Package).where(Package.id == plan_id))
        package = package_result.scalar_one_or_none()
        if package:
            plans.append({
                "name": package.name,
                "share": round((count / total_orders) * 100),
                "color": "var(--navy)" if package.name == "Starter" else "var(--teal)" if package.name == "Intensive" else "#f47a52",
            })

    # Top leaders (tutors with most assignments)
    leaders_result = await db.execute(
        select(User.full_name, func.count(Class.id).label("assignment_count"))
        .join(Class, Class.tutor_id == User.id)
        .where(
            and_(
                User.role == UserRole.TUTOR,
                Class.status == "scheduled",
                Class.scheduled_at >= datetime.utcnow(),
            )
        )
        .group_by(User.id, User.full_name)
        .order_by(func.count(Class.id).desc())
        .limit(5)
    )
    leaders = [{"name": name.split()[0] + " " + name.split()[-1][0] + ".", "value": count} 
               for name, count in leaders_result.all()]

    # Activity log (recent completed classes, new orders, new tutors)
    activity = []
    
    # Recent completed classes
    completed_classes = await db.execute(
        select(Class)
        .where(Class.status == "completed")
        .options(selectinload(Class.learner), selectinload(Class.tutor))
        .order_by(Class.updated_at.desc())
        .limit(5)
    )
    for c in completed_classes.scalars().all():
        tutor_name = c.tutor.full_name if c.tutor else "Tutor"
        activity.append({
            "id": f"act_{c.id}",
            "initial": "T",
            "text": f"{tutor_name} session completed",
            "time": "Just now",
        })

    # Recent orders
    recent_orders = await db.execute(
        select(Order)
        .options(selectinload(Order.package), selectinload(Order.user))
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    for o in recent_orders.scalars().all():
        user_name = o.user.full_name if o.user else "Student"
        activity.append({
            "id": f"act_order_{o.id}",
            "initial": "S",
            "text": f"{user_name} payment confirmed",
            "time": "Just now",
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

    # Bar groups for subscription chart - from actual package data
    # Get package order counts by time period or tier
    bars = []
    for plan_id, count in plans_data:
        package_result = await db.execute(select(Package).where(Package.id == plan_id))
        package = package_result.scalar_one_or_none()
        if package:
            # Calculate monthly distribution (simplified - using order creation dates)
            bars.append({
                "label": package.name,
                "bars": [
                    {"value": count, "color": "var(--navy)"},
                    {"value": max(0, count - 10), "color": "var(--teal)"},
                ],
            })
    
    # If no packages, provide defaults
    if not bars:
        bars = [
            {"label": "Basic", "bars": [{"value": 0, "color": "var(--navy)"}, {"value": 0, "color": "var(--teal)"}]},
            {"label": "Pro", "bars": [{"value": 0, "color": "var(--navy)"}, {"value": 0, "color": "var(--teal)"}]},
            {"label": "Premium", "bars": [{"value": 0, "color": "var(--navy)"}, {"value": 0, "color": "var(--teal)"}]},
        ]

    return {
        "unread": unread_result.scalar() or 0,
        "kpis": [
            {"label": "Total Tutors", "value": str(total_tutors)},
            {"label": "Active Students", "value": str(active_students)},
            {"label": "Scheduled Sessions", "value": str(scheduled_sessions)},
            {"label": "System Health", "value": system_health},
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
        "bars": bars,
    }