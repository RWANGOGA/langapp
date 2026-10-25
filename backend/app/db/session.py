from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=True, pool_pre_ping=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def stored_enum_values(enum_cls) -> list[str]:
    """Bind Python enum *values* instead of names for a SQLEnum column.

    Some Postgres types in this schema were created from the enum values
    ("completed", "mobile_money", "active") while SQLAlchemy defaults to binding
    the names ("COMPLETED"). On those columns the default raises
    InvalidTextRepresentationError on every insert and filter.
    """
    return [member.value for member in enum_cls]


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)