# Backend Implementation Plan (FastAPI + PostgreSQL + Docker)

## Features to Implement (in order)

### 1. **Packages & Checkout API** (matches `/checkout` frontend)
- `GET /api/v1/packages` - List 3 plans (Starter/Intensive/Mastery) with JPY/VND/USD
- `POST /api/v1/checkout` - Create order + payment session
- `GET /api/v1/checkout/{order_id}` - Get order status

### 2. **Tutors Directory API** (matches `/tutors` frontend)
- `GET /api/v1/tutors` - List with filters (specialty, language, search, sort)
- `GET /api/v1/tutors/{tutor_id}` - Single tutor profile

### 3. **Tutor Dashboard API** (matches `/tutor` frontend)
- `GET /api/v1/tutor/dashboard` - Roster, next session, calendar, learners
- `POST /api/v1/tutor/meeting-link` - Generate meeting link (Meet/Zoom/Teams)
- `POST /api/v1/tutor/feedback` - Submit lesson feedback

### 4. **Tutor Application API** (matches `/tutor/apply` frontend)
- `POST /api/v1/tutor/applications` - Submit application (multipart: cert + video)
- `GET /api/v1/tutor/applications/{id}` - Get application status

### 5. **Admin Dashboard API** (matches `/admin` frontend)
- `GET /api/v1/admin/dashboard` - KPIs, tutors, matrix, meetings, plans, leaders, activity, statuses, bars

### 6. **Auth & User Management**
- `POST /api/v1/auth/register` - Register (learner/tutor/admin)
- `POST /api/v1/auth/login` - Login (JWT)
- `GET /api/v1/users/me` - Current user profile

---

## Stack
- **FastAPI** + **SQLAlchemy 2.0** (async) + **Alembic** (migrations)
- **PostgreSQL 16** (Docker)
- **Pydantic v2** for schemas
- **python-jose** for JWT
- **passlib[bcrypt]** for password hashing
- **httpx** for external API calls (Zoom/Meet/Teams)

---

## Start: Feature 1 - Packages & Checkout