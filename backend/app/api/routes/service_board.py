"""
Service Board endpoints: the central hub for all service operations.
Manages service items of all types: Renewal, MidTermReview, Rewrite,
Endorsement, UWIssue, NonRenewal, PaymentIssue, General.
"""
import uuid
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, case, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, ServiceItem, Account, Policy
from app.schemas.schemas import (
    ServiceItemCreate, ServiceItemUpdate, ServiceItemResponse, ServiceBoardResponse
)
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/service-board", tags=["Service Board"])


@router.get("", response_model=ServiceBoardResponse)
async def get_service_board(
    type: Optional[str] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    assigned_to: Optional[uuid.UUID] = None,
    due_before: Optional[date] = None,
    due_after: Optional[date] = None,
    account_id: Optional[uuid.UUID] = None,
    policy_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the service board — all active service items with filtering.
    Returns items plus aggregate counts for the board header.
    """
    query = (
        select(
            ServiceItem,
            Account.name.label("account_name"),
            Policy.line_of_business.label("policy_lob"),
            User.name.label("assignee_name"),
        )
        .outerjoin(Account, ServiceItem.account_id == Account.id)
        .outerjoin(Policy, ServiceItem.policy_id == Policy.id)
        .outerjoin(User, ServiceItem.assigned_to == User.id)
    )

    # Filters
    if type:
        query = query.where(ServiceItem.type == type)
    if status:
        query = query.where(ServiceItem.status == status)
    else:
        # Default: exclude completed/closed
        query = query.where(ServiceItem.status.notin_(["Completed", "Closed"]))
    if urgency:
        query = query.where(ServiceItem.urgency == urgency)
    if assigned_to:
        query = query.where(ServiceItem.assigned_to == assigned_to)
    if due_before:
        query = query.where(ServiceItem.due_date <= due_before)
    if due_after:
        query = query.where(ServiceItem.due_date >= due_after)
    if account_id:
        query = query.where(ServiceItem.account_id == account_id)
    if policy_id:
        query = query.where(ServiceItem.policy_id == policy_id)
    if search:
        query = query.where(
            or_(
                Account.name.ilike(f"%{search}%"),
                ServiceItem.description.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(
        # Urgency ordering: Critical first, then High, Medium, Low
        case(
            (ServiceItem.urgency == "Critical", 0),
            (ServiceItem.urgency == "High", 1),
            (ServiceItem.urgency == "Medium", 2),
            (ServiceItem.urgency == "Low", 3),
        ),
        ServiceItem.due_date.asc().nullslast(),
    )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        si = row[0]
        item_data = ServiceItemResponse.model_validate(si)
        item_data.account_name = row.account_name
        item_data.policy_lob = row.policy_lob
        item_data.assignee_name = row.assignee_name
        items.append(item_data)

    # Counts for board header
    count_query = select(
        ServiceItem.status,
        func.count(ServiceItem.id),
    ).where(
        ServiceItem.status.notin_(["Completed", "Closed"])
    ).group_by(ServiceItem.status)
    count_result = await db.execute(count_query)
    counts_by_status = {row[0]: row[1] for row in count_result.all()}

    type_query = select(
        ServiceItem.type,
        func.count(ServiceItem.id),
    ).where(
        ServiceItem.status.notin_(["Completed", "Closed"])
    ).group_by(ServiceItem.type)
    type_result = await db.execute(type_query)
    counts_by_type = {row[0]: row[1] for row in type_result.all()}

    return ServiceBoardResponse(
        items=items,
        total=len(items),
        counts_by_status=counts_by_status,
        counts_by_type=counts_by_type,
    )


@router.post("", response_model=ServiceItemResponse, status_code=201)
async def create_service_item(
    body: ServiceItemCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create service items")

    item = ServiceItem(**body.model_dump())
    db.add(item)
    await db.flush()

    await audit_create(db, current_user.id, "ServiceItem", item.id,
                       ip=request.client.host if request.client else None)
    return ServiceItemResponse.model_validate(item)


@router.get("/{item_id}", response_model=ServiceItemResponse)
async def get_service_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ServiceItem, Account.name, Policy.line_of_business, User.name)
        .outerjoin(Account, ServiceItem.account_id == Account.id)
        .outerjoin(Policy, ServiceItem.policy_id == Policy.id)
        .outerjoin(User, ServiceItem.assigned_to == User.id)
        .where(ServiceItem.id == item_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Service item not found")

    item_data = ServiceItemResponse.model_validate(row[0])
    item_data.account_name = row[1]
    item_data.policy_lob = row[2]
    item_data.assignee_name = row[3]
    return item_data


@router.put("/{item_id}", response_model=ServiceItemResponse)
async def update_service_item(
    item_id: uuid.UUID,
    body: ServiceItemUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot update service items")

    result = await db.execute(select(ServiceItem).where(ServiceItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Service item not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(item, field)
        if old_value != value:
            # Track completion
            if field == "status" and value in ("Completed", "Closed"):
                item.completed_at = datetime.utcnow()
            await audit_update(db, current_user.id, "ServiceItem", item.id, field, str(old_value), str(value),
                               ip=request.client.host if request.client else None)
            setattr(item, field, value)

    await db.flush()
    return ServiceItemResponse.model_validate(item)
