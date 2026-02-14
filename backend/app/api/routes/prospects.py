"""
Prospect endpoints: CRUD, pipeline stage management, conversion to Account.
"""
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Prospect, Account
from app.schemas.schemas import ProspectCreate, ProspectUpdate, ProspectResponse, AccountResponse
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/prospects", tags=["Prospects"])


@router.get("")
async def list_prospects(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    pipeline_stage: Optional[str] = None,
    source: Optional[str] = None,
    assigned_producer_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Prospect)

    if pipeline_stage:
        query = query.where(Prospect.pipeline_stage == pipeline_stage)
    if source:
        query = query.where(Prospect.source == source)
    if assigned_producer_id:
        query = query.where(Prospect.assigned_producer_id == assigned_producer_id)
    if search:
        from sqlalchemy import or_
        query = query.where(
            or_(
                (Prospect.first_name + " " + Prospect.last_name).ilike(f"%{search}%"),
                Prospect.business_name.ilike(f"%{search}%"),
                Prospect.email.ilike(f"%{search}%"),
            )
        )

    # Producer sees only their own prospects
    if current_user.role == "Producer":
        query = query.where(Prospect.assigned_producer_id == current_user.id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Prospect.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    prospects = result.scalars().all()

    return {
        "items": [ProspectResponse.model_validate(p) for p in prospects],
        "total": total, "page": page, "page_size": page_size,
    }


@router.get("/pipeline")
async def pipeline_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pipeline counts and values by stage for the Kanban board."""
    query = select(
        Prospect.pipeline_stage,
        func.count(Prospect.id),
        func.coalesce(func.sum(Prospect.estimated_premium), 0),
    ).where(
        Prospect.pipeline_stage.notin_(["Closed-Won", "Closed-Lost"])
    ).group_by(Prospect.pipeline_stage)

    if current_user.role == "Producer":
        query = query.where(Prospect.assigned_producer_id == current_user.id)

    result = await db.execute(query)
    stages = {row[0]: {"count": row[1], "value": float(row[2])} for row in result.all()}
    return stages


@router.post("", response_model=ProspectResponse, status_code=201)
async def create_prospect(
    body: ProspectCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create prospects")

    prospect = Prospect(**body.model_dump())
    if not prospect.assigned_producer_id:
        prospect.assigned_producer_id = current_user.id

    db.add(prospect)
    await db.flush()

    await audit_create(db, current_user.id, "Prospect", prospect.id,
                       ip=request.client.host if request.client else None)
    return ProspectResponse.model_validate(prospect)


@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(
    prospect_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return ProspectResponse.model_validate(prospect)


@router.put("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: uuid.UUID,
    body: ProspectUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot update prospects")

    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(prospect, field)
        if old_value != value:
            # Handle closing
            if field == "pipeline_stage" and value in ("Closed-Won", "Closed-Lost"):
                prospect.closed_at = datetime.utcnow()
            await audit_update(db, current_user.id, "Prospect", prospect.id, field, str(old_value), str(value),
                               ip=request.client.host if request.client else None)
            setattr(prospect, field, value)

    await db.flush()
    return ProspectResponse.model_validate(prospect)


@router.put("/{prospect_id}/stage")
async def update_pipeline_stage(
    prospect_id: uuid.UUID,
    stage: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick stage update for Kanban drag-and-drop."""
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    old_stage = prospect.pipeline_stage
    prospect.pipeline_stage = stage

    if stage in ("Closed-Won", "Closed-Lost"):
        prospect.closed_at = datetime.utcnow()

    await audit_update(db, current_user.id, "Prospect", prospect.id, "pipeline_stage", old_stage, stage)
    await db.flush()
    return {"id": prospect_id, "pipeline_stage": stage}


@router.post("/{prospect_id}/convert", response_model=AccountResponse)
async def convert_to_account(
    prospect_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert a won prospect into an Account."""
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    if prospect.converted_account_id:
        raise HTTPException(status_code=400, detail="Prospect already converted")

    # Create the Account
    account = Account(
        name=prospect.business_name or f"{prospect.first_name} {prospect.last_name}",
        type="Commercial" if prospect.business_name else "Personal",
        status="Active",
        assigned_producer_id=prospect.assigned_producer_id,
        phone=prospect.phone,
        email=prospect.email,
        zip_code=prospect.zip_code,
        county=prospect.county,
    )
    db.add(account)
    await db.flush()

    # Update prospect
    prospect.pipeline_stage = "Closed-Won"
    prospect.closed_at = datetime.utcnow()
    prospect.converted_account_id = account.id

    await audit_create(db, current_user.id, "Account", account.id,
                       meta={"converted_from_prospect": str(prospect_id)})
    await audit_update(db, current_user.id, "Prospect", prospect.id, "converted_account_id", None, str(account.id))

    return AccountResponse.model_validate(account)
