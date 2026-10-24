"""
Shared pytest fixtures for API tests that run on an isolated in-memory
SQLite database (never the real Neon DB). Registered as a plugin from
tests/conftest.py via `pytest_plugins`, so any test module in this package
can request `db_session`, `client`, `klass`, etc.
"""
from datetime import datetime, timedelta

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole, Class, ClassStatus, ProficiencyLevel


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    """Packages.features is Postgres JSONB; render it as plain JSON on SQLite."""
    return "JSON"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def tutor_user(db_session: AsyncSession):
    tutor = User(
        email="tutor.test@example.com",
        hashed_password="x",
        full_name="Test Tutor",
        role=UserRole.TUTOR,
        is_active=True,
    )
    db_session.add(tutor)
    await db_session.commit()
    await db_session.refresh(tutor)
    return tutor


@pytest_asyncio.fixture
async def learner_user(db_session: AsyncSession):
    learner = User(
        email="learner.test@example.com",
        hashed_password="x",
        full_name="Test Learner",
        role=UserRole.STUDENT,
        proficiency_level=ProficiencyLevel.B1,
        is_active=True,
    )
    db_session.add(learner)
    await db_session.commit()
    await db_session.refresh(learner)
    return learner


@pytest_asyncio.fixture
async def other_tutor_user(db_session: AsyncSession):
    other = User(
        email="other.tutor@example.com",
        hashed_password="x",
        full_name="Other Tutor",
        role=UserRole.TUTOR,
        is_active=True,
    )
    db_session.add(other)
    await db_session.commit()
    await db_session.refresh(other)
    return other


def make_class(tutor_id: int, learner_id: int, hours_from_now: float = 2.0, class_id: int = None):
    """Class scheduled `hours_from_now` relative to UTC now (negative = past)."""
    return Class(
        id=class_id,
        learner_id=learner_id,
        tutor_id=tutor_id,
        title="Unit 7 - Conversation Practice",
        scheduled_at=datetime.utcnow() + timedelta(hours=hours_from_now),
        status=ClassStatus.SCHEDULED,
    )


@pytest_asyncio.fixture
async def klass(db_session: AsyncSession, tutor_user: User, learner_user: User):
    cls = make_class(tutor_user.id, learner_user.id, hours_from_now=2.0)
    db_session.add(cls)
    await db_session.commit()
    await db_session.refresh(cls)
    return cls


def make_client(db_session: AsyncSession, acting_user: User):
    """AsyncClient with get_db + get_current_user overridden."""
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = lambda: acting_user
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest_asyncio.fixture
async def client(db_session, tutor_user):
    async with make_client(db_session, tutor_user) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def learner_client(db_session, learner_user):
    async with make_client(db_session, learner_user) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def other_client(db_session, other_tutor_user):
    async with make_client(db_session, other_tutor_user) as ac:
        yield ac
    app.dependency_overrides.clear()
