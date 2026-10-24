"""Create (or verify) the first admin account from environment variables.

Hardening notes:
- Credentials come from the environment, never from this file. The old
  version shipped a hard-coded admin@langapp.com / admin123 pair, which
  anyone reading the repo could use against any deployment that ran it.
- The password is never printed.
- Importing this module has no side effects; the work runs only when the
  file is executed directly (so tests can import the validator safely).

Usage:
    ADMIN_EMAIL=you@nilelanguage.app ADMIN_PASSWORD='<strong secret>' \
        python create_admin.py

Set ADMIN_FULL_NAME to override the display name.
"""
import asyncio
import os
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine
from app.models.user import User, UserRole
from app.api.auth import get_password_hash


# Passwords that must never boot an admin account, however they arrive.
BLOCKLISTED_PASSWORDS = {
    "admin123",
    "admin123456",
    "password1234",
    "password123",
    "changeme",
    "changeme12345",
    "adminadmin12",
    "123456789012",
}

MIN_PASSWORD_LENGTH = 12

DEFAULT_ADMIN_NAME = "Site Administrator"


def resolve_admin_credentials(env: dict) -> tuple[str, str, str]:
    """Validate ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME from `env`.

    Raises ValueError unless a non-default pair is present. Pure function
    so the policy is unit-testable without touching a database.
    """
    email = (env.get("ADMIN_EMAIL") or "").strip()
    password = env.get("ADMIN_PASSWORD") or ""
    name = (env.get("ADMIN_FULL_NAME") or "").strip() or DEFAULT_ADMIN_NAME

    if not email or "@" not in email:
        raise ValueError("ADMIN_EMAIL must be set to a valid email address.")
    if not password:
        raise ValueError(
            "ADMIN_PASSWORD must be set. Generate one, e.g. "
            "python -c \"import secrets; print(secrets.token_urlsafe(24))\""
        )
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"ADMIN_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters.")
    if password.lower() in BLOCKLISTED_PASSWORDS:
        raise ValueError("ADMIN_PASSWORD is a known default and has been blocked.")

    return email, password, name


async def create_admin(email: str, password: str, name: str) -> bool:
    """Create the admin if absent. Returns True when a new account was made."""
    async with engine.begin() as conn:
        session = AsyncSession(bind=conn)

        result = await session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"Admin '{email}' already exists - no changes made.")
            return False

        session.add(User(
            email=email,
            full_name=name,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            native_language="English",
            timezone="UTC",
            is_active=True,
            is_verified=True,
        ))
        # The caller owns the transaction; engine.begin() commits on exit.
        await session.flush()
        return True


def main() -> int:
    try:
        email, password, name = resolve_admin_credentials(os.environ)
    except ValueError as err:
        print(f"Refusing to create an admin: {err}", file=sys.stderr)
        return 1
    created = asyncio.run(create_admin(email, password, name))
    if created:
        # Deliberately no password echo.
        print(f"Admin created for '{email}'.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
