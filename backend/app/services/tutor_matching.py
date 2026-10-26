"""Automatic learner-to-tutor matching, with the evidence kept.

Manual assignment does not scale: when hundreds of paid learners arrive in a
night, the engine has to place them and still be able to answer, the next
morning, why each one landed where it did. So every candidate is scored on the
four things a good placement actually depends on - can they talk, do they teach
what was bought, can the two of them be awake at the same hour, and how full
already - and each scored fact is written down as a plain sentence beside the
number it produced.

The rules are deliberately simple and legible. A weight nobody can explain is a
bug nobody can find.
"""
from dataclasses import dataclass, field
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.match_placement import MatchPlacement
from app.models.package import Order
from app.models.user import TutorProfile, User, UserRole

# The hours a lesson could reasonably be placed in, in the learner's own day.
LEARNER_DAY_START = 8 * 60   # 08:00 local
LEARNER_DAY_END = 20 * 60    # 20:00 local


@dataclass
class MatchCandidate:
    """One eligible tutor, scored for one learner, with reasons attached."""

    tutor: User
    score: float
    reasons: list[str] = field(default_factory=list)


def _to_minutes(hhmm: str) -> int:
    hours, _, minutes = hhmm.partition(":")
    return int(hours) * 60 + int(minutes)


def _utc_offset_minutes(zone: str | None) -> int | None:
    """The zone's offset from UTC right now, or None if the name is unknown.

    Rows written before validation existed can still carry a junk name; the
    engine treats that as "no idea" rather than crashing a payment callback
    over it. Offsets are taken at the current instant, which is the same
    convention the sign-up picker renders with.
    """
    if not zone:
        return None
    try:
        info = ZoneInfo(zone)
    except (KeyError, ZoneInfoNotFoundError):
        return None
    return int(datetime.now(info).utcoffset().total_seconds() // 60)


def _overlap_hours(tutor_windows: list, learner_offset: int | None) -> float | None:
    """Hours per week the tutor's windows fall inside the learner's working day.

    Both sides are shifted into UTC minutes and intersected on a minute grid
    (7 days x 1440 minutes - trivial to compute, and it wraps midnight and the
    date line without special cases); each window carries its own zone. None
    when the learner's zone is unknown or the tutor publishes nothing: there
    is no honest overlap to report then.
    """
    if learner_offset is None or not tutor_windows:
        return None
    grid = 7 * 1440
    tutor_minutes = set()
    for slot in tutor_windows:
        offset = _utc_offset_minutes(slot.timezone)
        if offset is None:
            continue
        # The weekday travels with the shift: subtracting the offset can push
        # an early-morning or late-night window into the neighbouring day, and
        # dropping that would score the week against the wrong days.
        start = _to_minutes(slot.start_time) - offset
        span = max(1, _to_minutes(slot.end_time) - _to_minutes(slot.start_time))
        minute = (slot.day_of_week * 1440 + start) % grid
        for _ in range(span):
            tutor_minutes.add(minute % grid)
            minute += 1
    learner_minutes = set()
    for day in range(7):
        for minute in range(LEARNER_DAY_START - learner_offset, LEARNER_DAY_END - learner_offset):
            learner_minutes.add((day * 1440 + minute) % grid)
    return len(tutor_minutes & learner_minutes) / 60


async def rank_tutors_for_learner(db: AsyncSession, learner: User, order: Order | None) -> list[MatchCandidate]:
    """Score every approved, active tutor for this learner, best first.

    Ties break on tutor id, oldest first: the engine must place the same
    learner in the same place when asked twice, and "whichever row the database
    happened to return first" is not a decision anyone could defend.
    """
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.tutor_profile).selectinload(TutorProfile.specialties),
            selectinload(User.tutor_profile).selectinload(TutorProfile.languages),
            selectinload(User.tutor_profile).selectinload(TutorProfile.availability),
            selectinload(User.learners),
        )
        .join(TutorProfile, TutorProfile.user_id == User.id)
        .where(
            User.role == UserRole.TUTOR,
            User.is_active.is_(True),
            TutorProfile.is_approved.is_(True),
        )
    )
    tutors = result.scalars().unique().all()

    subject = (order.subject if order else None) or ""
    candidates: list[MatchCandidate] = []
    for tutor in tutors:
        if tutor.id == learner.id:
            continue
        candidates.append(_score(tutor, learner, subject))
    candidates.sort(key=lambda c: (-c.score, c.tutor.id))
    return candidates


def _score(tutor: User, learner: User, subject: str) -> MatchCandidate:
    profile = tutor.tutor_profile
    reasons: list[str] = []
    score = 0.0

    # Language: the learner's own tongue, if the tutor teaches in it.
    if learner.native_language:
        spoken = [l.language for l in profile.languages]
        if learner.native_language in spoken:
            score += 3
            reasons.append(f"Teaches in {learner.native_language}")
        else:
            reasons.append(f"Does not teach in {learner.native_language}")
    else:
        reasons.append("Learner's language unknown")

    # Subject: what the paid order actually bought.
    if subject:
        taught = [s.specialty for s in profile.specialties]
        if subject in taught:
            score += 3
            reasons.append(f"Specialises in {subject}")
        else:
            reasons.append(f"No {subject} specialty on file")
    else:
        reasons.append("No subject on the order")

    # Timezone: real overlapping working hours, not a zonedistance guess.
    learner_offset = _utc_offset_minutes(learner.timezone)
    overlap = _overlap_hours(profile.availability, learner_offset)
    if learner_offset is None:
        score += 2
        reasons.append("Learner's time zone unknown - not scored")
    elif not profile.availability:
        score += 2
        reasons.append("Tutor publishes no availability windows - not scored")
    elif overlap >= 4:
        score += 4
        reasons.append(
            f"About {round(overlap)} shared working hours a week - same time zone"
        )
    elif overlap >= 2:
        score += 3
        reasons.append(
            f"About {round(overlap)} shared working hours a week - same time zone"
        )
    elif overlap > 0:
        score += 1
        reasons.append(
            f"Only {round(overlap)} shared working hours a week - time zones apart"
        )
    else:
        reasons.append("No working-hour overlap - time zones apart")

    # Load: spread learners across tutors instead of piling them on the first.
    load = len(tutor.learners)
    score += max(0.0, 3 - load)
    reasons.append(
        f"Teaching load: {load} learner{'s' if load != 1 else ''} already assigned"
    )

    return MatchCandidate(tutor=tutor, score=score, reasons=reasons)


def record_placement(
    db: AsyncSession,
    student: User,
    tutor: User,
    *,
    source: str,
    decided_by: int | None,
    score: float,
    reasons: list[str],
    order_id: int | None = None,
) -> MatchPlacement:
    """Write the audit line for a placement. Added to the session, not committed:
    the caller owns the transaction the placement lives or dies in."""
    placement = MatchPlacement(
        student_id=student.id,
        order_id=order_id,
        chosen_tutor_id=tutor.id,
        source=source,
        decided_by=decided_by,
        score=score,
        reasons=reasons,
    )
    db.add(placement)
    return placement
