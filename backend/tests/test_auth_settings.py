"""The admin Settings page was honest about being disconnected - which was
true, but also hid the fact that *no account* could change its own name,
timezone or password anywhere in the system. This is the missing user-facing
half of that: real settings, real validation.

Under test: PATCH /auth/me (name, native language, timezone - an unknown
timezone is refused, not stored as a guess) and POST /auth/change-password
(the current password must be proven before a new one is written, and the
old password stops working the moment the new one is set).
"""
import pytest
from sqlalchemy import select

from app.api.auth import get_password_hash, verify_password
from app.models.user import User, UserRole
from tests.sqlite_fixtures import db_session, make_client  # noqa: F401


async def make_user(db_session, password="current-secret-1"):
    user = User(
        email="settings.test@example.com",
        hashed_password=get_password_hash(password),
        full_name="Settings Tester",
        role=UserRole.STUDENT,
        is_active=True,
        is_verified=True,
        timezone="UTC",
        native_language="English",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestProfileSettings:
    @pytest.mark.asyncio
    async def test_a_user_updates_their_own_name_language_and_timezone(
        self, db_session
    ):
        user = await make_user(db_session)
        async with make_client(db_session, user) as ac:
            response = await ac.patch("/api/v1/auth/me", json={
                "full_name": "Settings Tester II",
                "native_language": "Japanese",
                "timezone": "Asia/Tokyo",
            })
        assert response.status_code == 200

        body = response.json()
        assert body["full_name"] == "Settings Tester II"
        assert body["native_language"] == "Japanese"
        assert body["timezone"] == "Asia/Tokyo"

        await db_session.refresh(user)
        assert user.timezone == "Asia/Tokyo", "the update must persist, not echo"

    @pytest.mark.asyncio
    async def test_an_unknown_timezone_is_refused(self, db_session):
        """Storing a made-up zone would poison every time rendered from it."""
        user = await make_user(db_session)
        async with make_client(db_session, user) as ac:
            response = await ac.patch("/api/v1/auth/me", json={
                "timezone": "Mars/Olympus_Mons",
            })
        assert response.status_code == 400

        await db_session.refresh(user)
        assert user.timezone == "UTC"

    @pytest.mark.asyncio
    async def test_a_blank_name_is_refused(self, db_session):
        user = await make_user(db_session)
        async with make_client(db_session, user) as ac:
            response = await ac.patch("/api/v1/auth/me", json={"full_name": "   "})
        assert response.status_code in (400, 422)


class TestRegistrationTimezone:
    """Sign-up asks for a timezone now, so it has to be held to the same rule
    as the settings page. A zone invented at registration would be read by
    every later decision that leans on it, and nothing would ever complain."""

    async def register(self, db_session, email, timezone):
        # Register is a public route; the signed-in identity in the shared
        # client is never consulted by it.
        seed = await make_user(db_session)
        async with make_client(db_session, seed) as ac:
            return await ac.post("/api/v1/auth/register", json={
                "email": email,
                "password": "at-least-eight",
                "full_name": "Zone Newcomer",
                "timezone": timezone,
            })

    @pytest.mark.asyncio
    async def test_a_real_zone_is_kept_exactly_as_chosen(self, db_session):
        response = await self.register(
            db_session, "zone.keep@example.com", "Africa/Nairobi"
        )
        assert response.status_code == 201
        assert response.json()["timezone"] == "Africa/Nairobi"

    @pytest.mark.asyncio
    async def test_an_invented_zone_is_refused_rather_than_stored(self, db_session):
        response = await self.register(
            db_session, "zone.fake@example.com", "Mars/Olympus_Mons"
        )
        assert response.status_code == 400

        found = await db_session.execute(
            select(User).where(User.email == "zone.fake@example.com")
        )
        assert found.scalar_one_or_none() is None, (
            "a refused registration must not leave an account behind"
        )

    @pytest.mark.asyncio
    async def test_signing_up_without_a_zone_is_still_allowed(self, db_session):
        """Timezone is optional at sign-up; refusing to guess must not be an
        error, or the form would punish the honest answer of 'unsure'."""
        response = await self.register(db_session, "zone.none@example.com", None)
        assert response.status_code == 201
        assert response.json()["timezone"] is None


class TestPasswordChange:
    @pytest.mark.asyncio
    async def test_the_current_password_must_be_proven(self, db_session):
        user = await make_user(db_session, password="right-one-123")
        async with make_client(db_session, user) as ac:
            response = await ac.post("/api/v1/auth/change-password", json={
                "current_password": "wrong-one-123",
                "new_password": "brand-new-456",
            })
        assert response.status_code == 400

        await db_session.refresh(user)
        assert verify_password("right-one-123", user.hashed_password), (
            "a refused change must leave the working password working"
        )

    @pytest.mark.asyncio
    async def test_a_proven_change_swaps_the_password(self, db_session):
        user = await make_user(db_session, password="right-one-123")
        async with make_client(db_session, user) as ac:
            response = await ac.post("/api/v1/auth/change-password", json={
                "current_password": "right-one-123",
                "new_password": "brand-new-456",
            })
        assert response.status_code == 200

        await db_session.refresh(user)
        assert verify_password("brand-new-456", user.hashed_password)
        assert not verify_password("right-one-123", user.hashed_password), (
            "the old password stops being a key the moment the new one exists"
        )

    @pytest.mark.asyncio
    async def test_a_short_new_password_is_refused(self, db_session):
        user = await make_user(db_session, password="right-one-123")
        async with make_client(db_session, user) as ac:
            response = await ac.post("/api/v1/auth/change-password", json={
                "current_password": "right-one-123",
                "new_password": "short",
            })
        assert response.status_code in (400, 422)

        await db_session.refresh(user)
        assert verify_password("right-one-123", user.hashed_password)
