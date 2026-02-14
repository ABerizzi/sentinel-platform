"""
Policy endpoints: CRUD, filtering, account-scoped listing.
"""
import uuid
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Policy, Installment, Carrier, Account
from app.schemas.schemas import (
    PolicyCreate, PolicyUpdate, PolicyResponse, PolicyListResponse,
    InstallmentCreate, InstallmentUpdate, InstallmentResponse,
)
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=PolicyListResponse)
async def list_policies(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    account_id: Optional[uuid.UUID] = None,
    line_of_business: Optional[str] = None,
    carrier_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    expiring_before: Optional[date] = None,
    expiring_after: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(
            Policy,
            Carrier.name.label("carrier_name"),
            Account.name.label("account_name"),
        )
        .outerjoin(Carrier, Policy.carrier_id == Carrier.id)
        .outerjoin(Account, Policy.account_id == Account.id)
    )

    if account_id:
        query = query.where(Policy.account_id == account_id)
    if line_of_business:
        query = query.where(Policy.line_of_business == line_of_business)
    if carrier_id:
        query = query.where(Policy.carrier_id == carrier_id)
    if status:
        query = query.where(Policy.status == status)
    if expiring_before:
        query = query.where(Policy.expiration_date <= expiring_before)
    if expiring_after:
        query = query.where(Policy.expiration_date >= expiring_after)

    count_base = select(func.count(Policy.id))
    if account_id:
        count_base = count_base.where(Policy.account_id == account_id)
    if line_of_business:
        count_base = count_base.where(Policy.line_of_business == line_of_business)
    if carrier_id:
        count_base = count_base.where(Policy.carrier_id == carrier_id)
    if status:
        count_base = count_base.where(Policy.status == status)
    if expiring_before:
        count_base = count_base.where(Policy.expiration_date <= expiring_before)
    if expiring_after:
        count_base = count_base.where(Policy.expiration_date >= expiring_after)
    total = (await db.execute(count_base)).scalar()

    query = query.order_by(Policy.expiration_date).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        policy = row[0]
        item = PolicyResponse.model_validate(policy)
        item.carrier_name = row.carrier_name
        item.account_name = row.account_name
        items.append(item)

    return PolicyListResponse(
        items=items,
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=PolicyResponse, status_code=201)
async def create_policy(
    body: PolicyCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create policies")

    policy = Policy(**body.model_dump())
    db.add(policy)
    await db.flush()

    await audit_create(db, current_user.id, "Policy", policy.id,
                       ip=request.client.host if request.client else None)
    return PolicyResponse.model_validate(policy)


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Policy, Carrier.name.label("carrier_name"), Account.name.label("account_name"))
        .outerjoin(Carrier, Policy.carrier_id == Carrier.id)
        .outerjoin(Account, Policy.account_id == Account.id)
        .where(Policy.id == policy_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    item = PolicyResponse.model_validate(row[0])
    item.carrier_name = row.carrier_name
    item.account_name = row.account_name
    return item


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: uuid.UUID,
    body: PolicyUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot edit policies")

    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(policy, field)
        if old_value != value:
            await audit_update(db, current_user.id, "Policy", policy.id, field, str(old_value), str(value),
                               ip=request.client.host if request.client else None)
            setattr(policy, field, value)

    await db.flush()
    return PolicyResponse.model_validate(policy)


# ---------- Installments ----------

@router.get("/{policy_id}/installments", response_model=list[InstallmentResponse])
async def list_installments(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Installment).where(Installment.policy_id == policy_id).order_by(Installment.due_date)
    )
    return [InstallmentResponse.model_validate(i) for i in result.scalars().all()]


@router.post("/{policy_id}/installments", response_model=InstallmentResponse, status_code=201)
async def create_installment(
    policy_id: uuid.UUID,
    body: InstallmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    installment = Installment(policy_id=policy_id, **body.model_dump(exclude={"policy_id"}))
    db.add(installment)
    await db.flush()
    await audit_create(db, current_user.id, "Installment", installment.id)
    return InstallmentResponse.model_validate(installment)


@router.put("/installments/{installment_id}", response_model=InstallmentResponse)
async def update_installment(
    installment_id: uuid.UUID,
    body: InstallmentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Installment).where(Installment.id == installment_id))
    installment = result.scalar_one_or_none()
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(installment, field)
        if old_value != value:
            await audit_update(db, current_user.id, "Installment", installment.id, field, str(old_value), str(value))
            setattr(installment, field, value)

    await db.flush()
    return InstallmentResponse.model_validate(installment)
