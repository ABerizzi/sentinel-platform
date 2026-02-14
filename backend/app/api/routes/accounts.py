"""
Account endpoints: CRUD, search, filtering.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Account, Contact
from app.schemas.schemas import (
    AccountCreate, AccountUpdate, AccountResponse, AccountListResponse,
    ContactResponse,
)
from app.services.audit import audit_create, audit_update, audit_delete

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    zip_code: Optional[str] = None,
    county: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Account)

    # Filters
    if search:
        query = query.where(
            or_(
                Account.name.ilike(f"%{search}%"),
                Account.email.ilike(f"%{search}%"),
                Account.phone.ilike(f"%{search}%"),
            )
        )
    if type:
        query = query.where(Account.type == type)
    if status:
        query = query.where(Account.status == status)
    if zip_code:
        query = query.where(Account.zip_code == zip_code)
    if county:
        query = query.where(Account.county.ilike(f"%{county}%"))

    # Role-based filtering: Producers see only assigned accounts
    if current_user.role == "Producer":
        query = query.where(Account.assigned_producer_id == current_user.id)

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginate
    query = query.order_by(Account.name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    accounts = result.scalars().all()

    return AccountListResponse(
        items=[AccountResponse.model_validate(a) for a in accounts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(
    body: AccountCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create accounts")

    account = Account(**body.model_dump())
    db.add(account)
    await db.flush()

    await audit_create(
        db, current_user.id, "Account", account.id,
        ip=request.client.host if request.client else None,
        ua=request.headers.get("user-agent"),
    )

    return AccountResponse.model_validate(account)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Role check: Producer can only see assigned accounts
    if current_user.role == "Producer" and account.assigned_producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return AccountResponse.model_validate(account)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot edit accounts")

    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(account, field)
        if old_value != value:
            await audit_update(
                db, current_user.id, "Account", account.id,
                field, str(old_value), str(value),
                ip=request.client.host if request.client else None,
                ua=request.headers.get("user-agent"),
            )
            setattr(account, field, value)

    await db.flush()
    return AccountResponse.model_validate(account)


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete accounts")

    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await audit_delete(
        db, current_user.id, "Account", account.id,
        ip=request.client.host if request.client else None,
        ua=request.headers.get("user-agent"),
    )
    await db.delete(account)


@router.get("/{account_id}/contacts", response_model=list[ContactResponse])
async def get_account_contacts(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact).where(Contact.account_id == account_id).order_by(Contact.is_primary.desc(), Contact.last_name)
    )
    contacts = result.scalars().all()
    return [ContactResponse.model_validate(c) for c in contacts]
