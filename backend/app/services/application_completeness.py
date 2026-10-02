"""Completion rules for the tutor application.

Single source of truth for "has the applicant supplied everything required",
used by both the submit gate (POST /tutor/applications) and the completeness
endpoint (GET /tutor/applications/me/completeness) so the UI can never
disagree with what the API will accept.

This validates presence and shape only. Whether the evidence is genuine is
decided by an admin during review.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class StepRequirement:
    step: int
    title: str
    required_fields: tuple


# Steps 2-8 map onto the eight-step form; step 1 carries identity fields.
REQUIRED_BY_STEP: Dict[int, StepRequirement] = {
    1: StepRequirement(
        step=1,
        title="Personal details",
        required_fields=("full_name", "country"),
    ),
    2: StepRequirement(
        step=2,
        title="Identity and qualification documents",
        required_fields=(
            "id_verification_provider",
            "id_verification_id",
            "qualification_type",
            "qualification_file_url",
        ),
    ),
    3: StepRequirement(
        step=3,
        title="English proficiency evidence",
        required_fields=("english_proof_type", "english_score"),
    ),
    4: StepRequirement(
        step=4,
        title="Introduction video",
        required_fields=("intro_video_url",),
    ),
    5: StepRequirement(
        step=5,
        title="Specialties and languages",
        required_fields=("specialties", "languages"),
    ),
    6: StepRequirement(
        step=6,
        title="Availability",
        required_fields=("availability_json",),
    ),
    7: StepRequirement(
        step=7,
        title="Agreements and consent",
        required_fields=(
            "tech_confirmed",
            "code_of_conduct_accepted",
            "privacy_agreement_accepted",
            "recording_consent",
        ),
    ),
    8: StepRequirement(
        step=8,
        title="References",
        required_fields=("reference_1_name", "reference_1_email"),
    ),
}

CONSENT_FIELDS = REQUIRED_BY_STEP[7].required_fields

# Comma-joined text columns need an explicit split before they count as filled.
_LIST_FIELDS = {"specialties", "languages"}

_BOOLEAN_TRUE = True


def _is_present(field_name: str, value: Any) -> bool:
    if value is None:
        return False
    if field_name in CONSENT_FIELDS:
        # Consents must be affirmatively true, not merely present.
        return value is _BOOLEAN_TRUE
    if field_name in _LIST_FIELDS:
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, set)):
            return len(value) > 0
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def evaluate(application: Any) -> Dict[str, Any]:
    """Assess a TutorApplication (or any object with the same attributes).

    Returns a payload with a per-step breakdown and an overall `can_submit`.
    """
    steps: List[Dict[str, Any]] = []
    incomplete_steps: List[int] = []

    for number in sorted(REQUIRED_BY_STEP):
        requirement = REQUIRED_BY_STEP[number]
        missing = [
            name
            for name in requirement.required_fields
            if not _is_present(name, getattr(application, name, None))
        ]
        if missing:
            incomplete_steps.append(number)
        steps.append(
            {
                "step": number,
                "title": requirement.title,
                "complete": not missing,
                "missing": missing,
            }
        )

    return {
        "steps": steps,
        "incomplete_steps": incomplete_steps,
        "can_submit": not incomplete_steps,
    }


def evaluate_submission(payload: Any) -> Dict[str, Any]:
    """Assess a TutorApplicationCreate before it is persisted.

    Works on the nested step payloads rather than model attributes, so an
    omitted step is simply reported as missing instead of silently defaulting.
    """
    steps: List[Dict[str, Any]] = []
    incomplete_steps: List[int] = []

    for number in sorted(REQUIRED_BY_STEP):
        requirement = REQUIRED_BY_STEP[number]
        block: Optional[Any] = getattr(payload, f"step{number}", None)
        missing = []
        for name in requirement.required_fields:
            if block is None:
                missing.append(name)
                continue
            if not _is_present(name, getattr(block, name, None)):
                missing.append(name)
        if missing:
            incomplete_steps.append(number)
        steps.append(
            {
                "step": number,
                "title": requirement.title,
                "complete": not missing,
                "missing": missing,
            }
        )

    return {
        "steps": steps,
        "incomplete_steps": incomplete_steps,
        "can_submit": not incomplete_steps,
    }


def summarise(report: Dict[str, Any]) -> str:
    """Human-readable 422 detail naming exactly what is outstanding."""
    lines = [
        f"Step {step['step']} ({step['title']}) is missing: {', '.join(step['missing'])}"
        for step in report["steps"]
        if not step["complete"]
    ]
    return "Incomplete application. " + "; ".join(lines)