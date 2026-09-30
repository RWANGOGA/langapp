from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User, UserRole, Class, ClassStatus, ProficiencyLevel
from app.models.package import Package, Order, OrderStatus, PaymentMethod, PlanName
from app.schemas.admin import (
    StudentAssignmentRequest, 
    StudentAssignmentResponse,
    StudentUnassignResponse
)

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
async def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
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

    # System Health (mock for now)
    system_health = "98%"

    # Tutors with their details
    tutors_result = await db.execute(
        select(User)
        .where(User.role == UserRole.TUTOR)
        .options(selectinload(User.tutor_profile))
        .limit(20)
    )
    tutors = tutors_result.scalars().all()

    # Get tutor statuses based on their profile approval and assignments
    tutors_data = []
    for t in tutors:
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
            "language": t.tutor_profile.country if t.tutor_profile else "English",
            "rating": t.tutor_profile.rating if t.tutor_profile else 0.0,
            "assignments": assignment_count,
        })

    # Matrix - create a simple assignment matrix
    # For each tutor, show 5 time slots with status
    matrix = []
    for t in tutors[:10]:  # Limit to 10 tutors for matrix
        # Get their scheduled classes for next 5 days
        classes_result = await db.execute(
            select(Class)
            .where(
                and_(
                    Class.tutor_id == t.id,
                    Class.status == "scheduled",
                    Class.scheduled_at >= datetime.utcnow(),
                    Class.scheduled_at <= datetime.utcnow() + timedelta(days=5),
                )
            )
            .order_by(Class.scheduled_at)
            .limit(5)
        )
        classes = classes_result.scalars().all()

        cells = []
        for i in range(5):
            if i < len(classes):
                c = classes[i]
                if c.status == "scheduled":
                    cells.append("confirmed")
                else:
                    cells.append(c.status.value if hasattr(c.status, 'value') else c.status)
            else:
                cells.append("empty")

        matrix.append({
            "tutor": t.full_name,
            "cells": cells,
        })

    # Meetings - check provider connections (mock for now)
    meetings = [
        {"provider": "Google Meet", "sessions": [], "connected": True},
        {"provider": "Zoom", "sessions": [], "connected": True},
        {"provider": "MS Teams", "sessions": [], "connected": False},
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
        provider = "Zoom"  # Default
        # Find or create meeting entry
        for m in meetings:
            if m["provider"] == provider:
                m["sessions"].append(f"{learner_name} - {session.title}, {time_str}")

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

    # Status counts for subscription management
    statuses = [
        {"label": "Active", "color": "var(--teal)"},
        {"label": "Renewing", "color": "var(--navy)"},
        {"label": "Expiring", "color": "#f3b04a"},
        {"label": "Cancelled", "color": "#d64545"},
    ]

    # Bar groups for subscription chart
    bars = [
        {"label": "Basic", "bars": [{"value": 50, "color": "var(--navy)"}, {"value": 25, "color": "var(--teal)"}]},
        {"label": "Pro", "bars": [{"value": 35, "color": "var(--navy)"}, {"value": 55, "color": "#f47a52"}]},
        {"label": "Premium", "bars": [{"value": 28, "color": "var(--navy)"}, {"value": 18, "color": "#f47a52"}]},
    ]

    return {
        "kpis": [
            {"label": "Total Tutors", "value": str(total_tutors)},
            {"label": "Active Students", "value": str(active_students)},
            {"label": "Scheduled Sessions", "value": str(scheduled_sessions)},
            {"label": "System Health", "value": system_health},
        ],
        "tutors": tutors_data,
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