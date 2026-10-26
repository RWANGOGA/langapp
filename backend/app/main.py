from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import packages, tutors, auth, tutor_application, learner, admin, tutor_dashboard, tutor_sessions, tutor_pages, notifications, payment_tracking, admin_payments, tutor_earnings, contact
from app.db.session import init_db


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(packages.router, prefix=settings.API_V1_STR, tags=["packages"])
app.include_router(tutors.router, prefix=settings.API_V1_STR, tags=["tutors"])
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(tutor_application.router, prefix=settings.API_V1_STR, tags=["tutor-applications"])
app.include_router(learner.router, prefix=settings.API_V1_STR, tags=["learner"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(tutor_dashboard.router, prefix=settings.API_V1_STR, tags=["tutor-dashboard"])
app.include_router(tutor_earnings.router, prefix=settings.API_V1_STR, tags=["tutor-earnings"])
app.include_router(tutor_sessions.router, prefix=settings.API_V1_STR, tags=["tutor-sessions"])
app.include_router(tutor_pages.router, prefix=settings.API_V1_STR, tags=["tutor-pages"])
app.include_router(notifications.router, prefix=settings.API_V1_STR, tags=["notifications"])
app.include_router(payment_tracking.router, prefix=settings.API_V1_STR, tags=["payment-tracking"])
app.include_router(admin_payments.router, prefix=f"{settings.API_V1_STR}/admin/payments", tags=["admin-payments"])
app.include_router(contact.router, prefix=settings.API_V1_STR, tags=["contact"])


@app.on_event("startup")
async def on_startup():
    await init_db()


@app.get("/health")
async def health_check():
    return {"status": "ok"}