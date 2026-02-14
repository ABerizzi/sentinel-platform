"""
Carrier endpoints: CRUD for carriers and carrier contacts.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Carrier, CarrierContact
from app.schemas.schemas import CarrierCreate, CarrierResponse
from app.services.audit import audit_create

router = APIRouter(prefix="/carriers", tags=["Carriers"])


@router.get("", response_model=list[CarrierResponse])
async def list_carriers(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Carrier)
    if search:
        query = query.where(Carrier.name.ilike(f"%{search}%"))
    query = query.order_by(Carrier.name)
    result = await db.execute(query)
    return [CarrierResponse.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CarrierResponse, status_code=201)
async def create_carrier(
    body: CarrierCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    carrier = Carrier(**body.model_dump())
    db.add(carrier)
    await db.flush()
    await audit_create(db, current_user.id, "Carrier", carrier.id)
    return CarrierResponse.model_validate(carrier)


@router.get("/{carrier_id}", response_model=CarrierResponse)
async def get_carrier(
    carrier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Carrier).where(Carrier.id == carrier_id))
    carrier = result.scalar_one_or_none()
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return CarrierResponse.model_validate(carrier)
