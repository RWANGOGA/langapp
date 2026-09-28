from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT
    native_language: Optional[str] = None
    timezone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(UserBase):
    id: int
    role: UserRole
    avatar_url: Optional[str] = None
    native_language: Optional[str] = None
    timezone: Optional[str] = None
    is_active: bool
    is_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: int
    email: str
    role: UserRole
    exp: int
    iat: int
    type: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class Message(BaseModel):
    message: str