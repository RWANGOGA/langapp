# Tutor Onboarding — Functional Specification

Redesign of the "Become a Tutor" journey so that a user is presented with the
verification requirements **before** creating an account, and `User.role`
transitions `STUDENT → TUTOR` **only** after a complete application passes admin
review.

Status: specification only — no code changed by this document.
Authored against commit `467fb7a`.

---

## 1. Current state (as-is)

Most of the requested flow already exists. Grounded inventory:

| Concern | Exists? | Location |
|---|---|---|
| 8-step application form | Yes | `src/app/tutor/apply/page.tsx` (592 lines) |
| Application model + statuses | Yes | `backend/app/models/tutor_application.py:24-81` |
| Submit endpoint | Yes | `backend/app/api/tutor_application.py:21` |
| Resumable draft (read/patch) | Yes | `backend/app/api/tutor_application.py:76,88` |
| Admin list + review | Yes | `backend/app/api/tutor_application.py:113,161,177` |
| **Role promotion on approval** | Yes | `backend/app/api/tutor_application.py:197-220` |
| **Requirements/docs page before signup** | **No** | — |
| **Server-side completeness check** | **No** | — |
| **Block self-declared tutor role** | **No** | — |

The promotion gate is already correct and should be preserved:
`review_application` sets `user.role = UserRole.TUTOR` and creates a
`TutorProfile` **only** inside the `status == APPROVED` branch, and that
endpoint is `Depends(require_admin)`.

---

## 2. Blocking defect found during analysis

**`backend/app/api/auth.py:128` lets any visitor self-declare the tutor role.**

```python
role = UserRole.TUTOR if user_in.role == UserRole.TUTOR else UserRole.STUDENT
```

`UserCreate` accepts a client-supplied `role`, and the signup UI exposes it as a
dropdown (`src/app/auth/register/page.tsx:148-157`, defaulting `callbackUrl` to
`/tutor` at line 67). A visitor can therefore register as a tutor in one request
and skip the entire application and verification flow.

The `is_approved=False` profile created at `auth.py:140` does **not** mitigate
this: `role` is already `TUTOR`, and role is what the rest of the app branches
on. `POST /tutor/applications` correctly rejects non-students
(`tutor_application.py:27`), so the escalation also *locks the user out* of the
legitimate path.

This directly contradicts the requirement that status transition to "Tutor" only
after onboarding criteria are met, and it is a prerequisite to the rest of this
spec. **Fix this first, independently of the UI work.**

Secondary issue: CORS is pinned to localhost in both `config.py:13` and
`backend/.env:15`, while `apply/page.tsx:107,200` calls
`${NEXT_PUBLIC_API_URL}` cross-origin rather than through the `/api/v1` rewrite.
That path will fail CORS against the deployed frontend origin.

---

## 3. Target user journey

```
                  ┌─────────────────────────────────────┐
  "Become a Tutor"│  Step 0 — Requirements & Documents   │  PUBLIC
  (CTA) ─────────▶│  no account required, no form        │
                  └──────────────────┬──────────────────┘
                                     │ "Start application"
                                     ▼
                  ┌─────────────────────────────────────┐
                  │  Step 1 — Create account             │  forced role=STUDENT
                  │  email / password                    │
                  └──────────────────┬──────────────────┘
                                     │ authenticated
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  Steps 2-9 — Application (existing 8-step form)         │
        │  personal → identity → English proof → intro video →   │
        │  specialties → availability → consents → references     │
        └──────────────────┬─────────────────────────────────────┘
                           │ POST /tutor/applications
                           ▼
              ┌────────────────────────────┐
              │  SUBMITTED  (auto-checks)  │
              └─────────────┬──────────────┘
                            │ admin review pipeline
                            ▼
     DOCUMENTS_REVIEW → ENGLISH_TEST → DEMO_LESSON → APPROVED
                            │                        │
                            └──► REJECTED           │ require_admin
                                 (resubmit)          ▼
                                          User.role = TUTOR
                                          TutorProfile(is_approved=True)
```

`WITHDRAWN` is reachable by the applicant at any point and returns them to
Step 0 of a fresh attempt.

### Step 0 — Requirements & Documents (the new surface)

This is what replaces the current dead-end CTA. Public, unauthenticated,
read-only. Content:

- **Required documents** — government photo ID; proof of address; teaching
  qualification (TEFL/IELTS/CELTA or degree transcript); English proficiency
  evidence (IELTS/TOEFL score or equivalent).
- **Format rules** — accepted file types, per-file size cap, legibility
  requirements, how long documents are retained.
- **What happens next** — the 5-stage review pipeline, indicative turnaround
  per stage, and the demo-lesson expectation.
- **Policy links** — code of conduct, privacy agreement, recording consent,
  background-check disclosure.
- **Eligibility checklist** — interactive confirmation the applicant can meet
  each requirement before starting.

Primary CTA: `Start application` → `/auth/register?intent=tutor`, which forces
role `STUDENT` and returns to `/tutor/apply` after signup.

Copy must not promise approval, and must state that submitting does not confer
tutor access.

---

## 4. State machine

`ApplicationStatus` is unchanged (`models/tutor_application.py:8-16`). Legal
transitions are server-enforced:

| From | Allowed to |
|---|---|
| `SUBMITTED` | `DOCUMENTS_REVIEW`, `REJECTED`, `WITHDRAWN` |
| `DOCUMENTS_REVIEW` | `ENGLISH_TEST`, `REJECTED` |
| `ENGLISH_TEST` | `DEMO_LESSON`, `REJECTED` |
| `DEMO_LESSON` | `APPROVED`, `REJECTED` |
| `REJECTED` | resubmit → `SUBMITTED` (clears `is_approved`, keeps audit trail) |
| `APPROVED` | terminal |
| `WITHDRAWN` | terminal (new application allowed) |

`current_step` (`models/tutor_application.py:31`) is currently declared but
never written. It should be maintained on each partial save to drive
resume-where-you-left-off. Backward transition must be rejected with `409`.

---

## 5. Completeness gate (missing today)

`TutorApplicationCreate` declares steps 2-8 as `Optional`
(`schemas/tutor_application.py:54-62`), so the API accepts a submission
containing **only** step 1. Two defects follow:

1. **No completeness enforcement** — `POST /tutor/applications` must return
   `422` listing the missing steps, per the matrix below.
2. **Consent integrity** — `TutorApplicationStep7` defaults all four consent
   flags to `True` (`schemas/tutor_application.py:40-43`), and
   `tutor_application.py:59-62` compounds this with `if step7 else True`. An
   applicant who omits step 7 is recorded as having accepted the code of
   conduct, privacy agreement, and recording consent. Consents must default to
   `False` and be required explicitly.

### Required-by-submission matrix

| Step | Field(s) | Required |
|---|---|---|
| 1 | `full_name`, `country` | yes |
| 2 | `id_verification_provider`, `id_verification_id`, `qualification_type`, `qualification_file_url` | yes |
| 3 | `english_proof_type`, `english_score` | yes |
| 4 | `intro_video_url`; `years_experience` optional | video yes |
| 5 | `specialties`, `languages` (both non-empty) | yes |
| 6 | `availability` | yes |
| 7 | all four consents — explicit `true` | yes |
| 8 | `reference_1_name`, `reference_1_email`; second reference optional | 1 ref yes |

Adjudication of *whether the evidence is genuine* stays with admin; the gate
only enforces presence and format.

---

## 6. API contract

Existing endpoints are correctly shaped and are reused unchanged:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/tutor/applications` | student | submit; now completeness-gated |
| `GET` | `/api/v1/tutor/applications/me` | any | draft + status; `404` if none |
| `PATCH` | `/api/v1/tutor/applications/me` | owner | save step; only `SUBMITTED`/`DOCUMENTS_REVIEW` |
| `GET` | `/api/v1/tutor/applications` | admin | paginated list, filter by status/search |
| `GET` | `/api/v1/tutor/applications/{id}` | admin | full detail |
| `PATCH` | `/api/v1/tutor/applications/{id}` | admin | review; promotes role on `APPROVED` |
| `DELETE` | `/api/v1/tutor/applications/{id}` | owner/admin | withdraw |

Required changes:

- **`POST /auth/register`** — ignore any client-supplied `role`; always
  `STUDENT`. Optional `intent=tutor` is recorded for analytics only and must not
  influence the stored role.
- **New:** `GET /api/v1/tutor/requirements` — public, unauthenticated. Returns
  the Step 0 content (document catalogue, format rules, policy versions) so the
  page renders from a single source of truth rather than duplicating copy in
  the component.
- **New:** `GET /api/v1/tutor/applications/me/completeness` — returns
  `{steps: [{step, complete, missing[]}], can_submit: bool}`, so the UI can show
  exactly what is outstanding before enabling submit.
- `PATCH .../me` must persist `current_step` and reject changes once the
  application leaves an editable state.

---

## 7. Frontend changes

**New** `src/app/tutor/requirements/page.tsx` — public Step 0.
**New** `src/app/tutor/requirements/requirements.module.css` — CSS module using
existing design tokens (`--navy`, `--teal`, `--coral`, `--mint`, `--ink`).

**Modified** CTAs — currently both point at `/tutors`, the browse directory,
which is a dead end for the applicant:

- `src/app/page.tsx:90` — `Become a Tutor` → `/tutor/requirements`
- `src/app/tutors/page.tsx:19` — `Become a Tutor` → `/tutor/requirements`

**Modified** `src/app/auth/register/page.tsx`:

- remove the role `<select>` (lines 148-157); role is implied by
  `?intent=tutor`
- on success, route to `/tutor/apply` when `intent=tutor`, else the existing
  default

**Modified** `src/app/tutor/apply/page.tsx`:

- add a requirements summary/acknowledgement step before the form
- render submit as disabled until `can_submit`
- surface per-step missing fields from the completeness endpoint
- route API calls through the `/api/v1` rewrite instead of
  `${NEXT_PUBLIC_API_URL}` (see §2 CORS)

`/tutor/apply` stays behind the existing `src/proxy.ts` guard, which already
redirects unauthenticated users to login with a `callbackUrl`.

---

## 8. Acceptance criteria

1. `POST /auth/register` with `{"role": "tutor"}` stores `role=STUDENT`.
2. Registering with `intent=tutor` still yields `STUDENT` and lands on
   `/tutor/apply`.
3. `GET /tutor/requirements` is reachable with no session.
4. Submitting with any required step missing returns `422` naming the step.
5. Omitting step 7 stores `false` for all four consents, never `true`.
6. `User.role` is `STUDENT` for every application status except `APPROVED`.
7. Only `require_admin` can set `APPROVED`; only `APPROVED` promotes the role.
8. `REJECTED` leaves `role=STUDENT` and clears no prior profile approval.
9. A `PATCH .../me` after leaving an editable state returns `409`.
10. Both "Become a Tutor" CTAs land on the requirements page.

## 9. Out of scope

Automated identity/background-check integrations (fields are captured and
adjudicated manually for now), document file storage and virus scanning,
applicant-facing status notifications, and admin review UI — the review
endpoint exists but has no applicant-facing queue screen.