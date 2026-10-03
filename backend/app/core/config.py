from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_asyncpg_url(url: str) -> str:
    """Convert common PostgreSQL URLs into URLs accepted by asyncpg."""
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    parsed = urlsplit(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "sslmode" in query:
        query["ssl"] = query.pop("sslmode")
    query.pop("channel_binding", None)
    return urlunsplit(parsed._replace(query=urlencode(query)))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    DATABASE_URL: str
    # Neon migrations should use the direct (unpooled) endpoint. Runtime API
    # traffic may continue using the pooled endpoint in DATABASE_URL.
    DATABASE_URL_UNPOOLED: Optional[str] = None
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "LinguaBridge API"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    PAYMENT_WEBHOOK_SECRET: Optional[str] = None
    PAYMENT_WEBHOOK_TOLERANCE_SECONDS: int = 300
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    ENVIRONMENT: str = "development"

    def model_post_init(self, __context: object) -> None:
        self.DATABASE_URL = normalize_asyncpg_url(self.DATABASE_URL)
        if self.DATABASE_URL_UNPOOLED:
            self.DATABASE_URL_UNPOOLED = normalize_asyncpg_url(self.DATABASE_URL_UNPOOLED)


settings = Settings()