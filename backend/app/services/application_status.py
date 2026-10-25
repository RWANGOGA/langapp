"""Where a tutor application stands, in terms the applicant can act on.

The apply form finishes by sending people back to /tutor/requirements, which
only ever said "Start my application" - so an applicant who had just given
eight steps of their life to us landed on the page they had started from and
learned nothing about what happened next.

This turns the record's raw state into the three facts a page needs, and no
more than the record supports:

* which stage of the published review process the file sits in,
* which pieces of evidence a reviewer has actually signed off,
* whose turn it is to move next, and what that move is.

The stage list lives here rather than in the endpoint so the promise made on
the requirements page and the progress shown after applying are literally the
same object - they cannot drift into describing two different processes.
"""

from typing import Any, Optional

from app.models.tutor_application import ApplicationStatus, VerificationStatus
from app.schemas.tutor_application import (
    ApplicationCheckView,
    ApplicationStageView,
    ApplicationStatusView,
    ReviewStage,
)
from app.services import application_completeness as completeness

# The published review process, in order. Step 0 shows it as a promise; an
# applicant with a file in flight sees it as a rail.
REVIEW_STAGES: tuple[ReviewStage, ...] = (
    ReviewStage(
        key="documents_review",
        title="Document review",
        description="We verify every document is current, legible and belongs to you.",
        indicative_days="2-3 business days",
    ),
    ReviewStage(
        key="english_test",
        title="English assessment",
        description="A short written and spoken check to confirm you can teach at the advertised level.",
        indicative_days="2 business days",
    ),
    ReviewStage(
        key="demo_lesson",
        title="Demo lesson",
        description="A short trial lesson with our academic team, scored out of 100.",
        indicative_days="3-5 business days",
    ),
    ReviewStage(
        key="approved",
        title="Account activation",
        description="Your tutor profile is published and you can accept your first class.",
        indicative_days="Immediate",
    ),
)

# Statuses where a reviewer still holds the file.
OPEN_STATUSES = {
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.DOCUMENTS_REVIEW,
    ApplicationStatus.ENGLISH_TEST,
    ApplicationStatus.DEMO_LESSON,
}

# Which published stage each in-flight status sits in. SUBMITTED has no stage
# of its own: it means received, and document review is what happens next.
STAGE_FOR_STATUS = {
    ApplicationStatus.SUBMITTED: "documents_review",
    ApplicationStatus.DOCUMENTS_REVIEW: "documents_review",
    ApplicationStatus.ENGLISH_TEST: "english_test",
    ApplicationStatus.DEMO_LESSON: "demo_lesson",
}

# Evidence a reviewer signs off, and the move each failure asks of the
# applicant. qualification_verified and english_verified are booleans with no
# "rejected" value - False only ever means "not yet signed off", so the worst
# state reported for them is pending, never a failure the applicant never had.
CHECKS = (
    (
        "identity",
        "Identity document",
        lambda a: _verification(a.id_verification_status),
        "Your identity document was not accepted. Upload a clearer photo, or "
        "a different government-issued document.",
    ),
    (
        "qualification",
        "Teaching qualification",
        lambda a: "verified" if a.qualification_verified else "pending",
        None,
    ),
    (
        "english",
        "English proficiency",
        lambda a: "verified" if a.english_verified else "pending",
        None,
    ),
    (
        "background",
        "Background check",
        lambda a: _verification(a.background_check_status),
        "Your background check did not clear. Contact support before your "
        "first class can be scheduled.",
    ),
)

DEMO_ACTION = (
    "Your demo lesson is the next step. Our academic team will contact you to "
    "arrange a time - keep the availability you submitted free."
)
# No autosave claim: the form holds answers in the browser only until they are
# submitted, so an applicant who walks away mid-form has saved nothing.
APPLY_ACTION = (
    "Nothing is on file for this account. Start the application when your "
    "documents are to hand - it is one sitting."
)


def _verification(value: Any) -> str:
    if value == VerificationStatus.VERIFIED:
        return "verified"
    if value == VerificationStatus.FAILED:
        return "failed"
    return "pending"


def _stage(stage: ReviewStage, state: str) -> ApplicationStageView:
    return ApplicationStageView(
        key=stage.key,
        title=stage.title,
        description=stage.description,
        state=state,
        indicative_days=stage.indicative_days,
    )


def _rail(status: ApplicationStatus, current_key: Optional[str]) -> list[ApplicationStageView]:
    """Place every published stage relative to where the file actually is."""
    if status == ApplicationStatus.APPROVED:
        return [_stage(stage, "complete") for stage in REVIEW_STAGES]
    if current_key is None:
        # A closed file. Rejection can arrive from any stage and the record
        # keeps only the outcome, so no path is reconstructed here.
        return []
    seen_current = False
    stages = []
    for stage in REVIEW_STAGES:
        if stage.key == current_key:
            state = "current"
            seen_current = True
        elif seen_current:
            state = "upcoming"
        else:
            state = "complete"
        stages.append(_stage(stage, state))
    return stages


def _outstanding_steps(application: Any) -> list[str]:
    report = completeness.evaluate(application)
    return [
        f"step {step['step']} ({step['title']})"
        for step in report["steps"]
        if not step["complete"]
    ]


def _all_upcoming() -> list[ApplicationStageView]:
    """Review has not begun - the true state of a draft and of a file that was
    never submitted."""
    return [_stage(stage, "upcoming") for stage in REVIEW_STAGES]


def describe(application: Any | None) -> ApplicationStatusView:
    """Build the applicant's view of their own application."""
    if application is None:
        return ApplicationStatusView(
            has_application=False,
            waiting_on="you",
            action_required=APPLY_ACTION,
        )

    status = application.status
    submitted = completeness.evaluate(application)["can_submit"]
    checks = [
        ApplicationCheckView(id=check_id, label=label, state=read(application))
        for check_id, label, read, _ in CHECKS
    ]

    # Order matters: an obligation on the applicant outranks where the school's
    # process sits, because a rejected document stops review until it is fixed.
    waiting_on = "school" if status in OPEN_STATUSES else "nobody"
    action_required: Optional[str] = None

    if not submitted:
        waiting_on = "you"
        outstanding = _outstanding_steps(application)
        action_required = (
            "Your application is not submitted yet. Still outstanding: "
            + ", ".join(outstanding) + "."
        )
    elif status in OPEN_STATUSES:
        failed = [
            action
            for check_id, label, read, action in CHECKS
            if action and read(application) == "failed"
        ]
        if failed:
            waiting_on = "you"
            action_required = " ".join(failed)
        elif status == ApplicationStatus.DEMO_LESSON:
            waiting_on = "you"
            action_required = DEMO_ACTION

    stages = _all_upcoming() if not submitted else _rail(status, STAGE_FOR_STATUS.get(status))

    return ApplicationStatusView(
        has_application=True,
        status=status.value,
        submitted=submitted,
        waiting_on=waiting_on,
        action_required=action_required,
        can_reapply=status == ApplicationStatus.REJECTED,
        stages=stages,
        checks=checks,
        last_update=application.reviewed_at or application.updated_at,
    )
