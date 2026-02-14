"""
Authentication endpoints: login, register, current user.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import (
    hash_password, verify_password, create_access_token, get_current_user, require_role
)
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, RegisterRequest, UserResponse
from app.services.audit import write_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Update last login
    user.last_login = datetime.utcnow()

    # Audit
    await write_audit_log(
        db, user.id, "Login", "User", user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """Register a new user. Admin only."""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()

    await write_audit_log(db, current_user.id, "Create", "User", user.id)

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/setup", response_model=TokenResponse, status_code=201)
async def initial_setup(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    One-time setup: creates the first Admin user.
    Only works if no users exist in the database.
    """
    result = await db.execute(select(User).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Setup already completed. Users exist.")

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role="Admin",  # First user is always Admin
        last_login=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    await write_audit_log(
        db, user.id, "Create", "User", user.id,
        ip_address=request.client.host if request.client else None,
        metadata={"event": "initial_setup"},
    )

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )
