from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from app.core.roles import Role


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = Role.USER.value
    org_name: str
    org_type: str  # Will be validated as OrgType enum


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    is_active: bool
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    billing_cycle: Optional[str] = None

    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic v2


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None 