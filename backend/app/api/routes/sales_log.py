"""
Sales Performance Log endpoints: entry tracking, trend analysis, quota monitoring.
"""
import uuid
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, extract, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, SalesLogEntry, Account, Carrier
from app.schemas.schemas import SalesLogCreate, SalesLogResponse
from app.services.audit import audit_create

router = APIRouter(prefix="/sales-log", tags=["Sales Log"])


@router.get("")
async def list_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    line_of_business: Optional[str] = None,
    sale_type: Optional[str] = None,
    source: Optional[str] = None,
    zip_code: Optional[str] = None,
    county: Optional[str] = None,
    carrier_id: Optional[uuid.UUID] = None,
    producer_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(
            SalesLogEntry,
            Account.name.label("account_name"),
            Carrier.name.label("carrier_name"),
            User.name.label("producer_name"),
        )
        .outerjoin(Account, SalesLogEntry.account_id == Account.id)
        .outerjoin(Carrier, SalesLogEntry.carrier_id == Carrier.id)
        .outerjoin(User, SalesLogEntry.producer_id == User.id)
    )

    if date_from:
        query = query.where(SalesLogEntry.date >= date_from)
    if date_to:
        query = query.where(SalesLogEntry.date <= date_to)
    if line_of_business:
        query = query.where(SalesLogEntry.line_of_business == line_of_business)
    if sale_type:
        query = query.where(SalesLogEntry.sale_type == sale_type)
    if source:
        query = query.where(SalesLogEntry.source == source)
    if zip_code:
        query = query.where(SalesLogEntry.zip_code == zip_code)
    if county:
        query = query.where(SalesLogEntry.county.ilike(f"%{county}%"))
    if carrier_id:
        query = query.where(SalesLogEntry.carrier_id == carrier_id)
    if producer_id:
        query = query.where(SalesLogEntry.producer_id == producer_id)

    count_q = select(func.count()).select_from(
        select(SalesLogEntry.id).select_from(query.subquery()).subquery()
    )
    total_result = await db.execute(select(func.count()).select_from(
        query.with_only_columns(SalesLogEntry.id).subquery()
    ))
    total = total_result.scalar() or 0

    query = query.order_by(SalesLogEntry.date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        entry = SalesLogResponse.model_validate(row[0])
        entry.account_name = row.account_name
        entry.carrier_name = row.carrier_name
        entry.producer_name = row.producer_name
        items.append(entry)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=SalesLogResponse, status_code=201)
async def create_sale(
    body: SalesLogCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot log sales")

    entry = SalesLogEntry(**body.model_dump(), producer_id=current_user.id)
    db.add(entry)
    await db.flush()

    await audit_create(db, current_user.id, "SalesLogEntry", entry.id,
                       ip=request.client.host if request.client else None)
    return SalesLogResponse.model_validate(entry)


@router.get("/summary")
async def sales_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Summary cards: today, this week, this month, YTD.
    Plus Allstate auto items quota tracking.
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    async def get_period_stats(start: date, end: date = None):
        q = select(
            func.count(SalesLogEntry.id),
            func.coalesce(func.sum(SalesLogEntry.premium), 0),
        ).where(SalesLogEntry.date >= start)
        if end:
            q = q.where(SalesLogEntry.date <= end)
        r = await db.execute(q)
        row = r.one()
        return {"count": row[0], "premium": float(row[1])}

    today_stats = await get_period_stats(today, today)
    week_stats = await get_period_stats(week_start)
    month_stats = await get_period_stats(month_start)
    ytd_stats = await get_period_stats(year_start)

    # Allstate auto items this month (quota = 13)
    auto_q = select(func.count(SalesLogEntry.id)).where(
        and_(
            SalesLogEntry.date >= month_start,
            SalesLogEntry.line_of_business == "Personal Auto",
            SalesLogEntry.sale_type.in_(["New Business", "Rewrite"]),
        )
    )
    auto_result = await db.execute(auto_q)
    auto_items = auto_result.scalar() or 0

    return {
        "today": today_stats,
        "this_week": week_stats,
        "this_month": month_stats,
        "ytd": ytd_stats,
        "allstate_quota": {
            "auto_items_this_month": auto_items,
            "target": 13,
            "remaining": max(0, 13 - auto_items),
            "on_track": auto_items >= (13 * today.day / 30),
        },
    }


@router.get("/trends")
async def sales_trends(
    period: str = Query("monthly", pattern="^(daily|weekly|monthly)$"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    group_by: str = Query("lob", pattern="^(lob|source|zip|county|carrier|sale_type)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trend analysis with flexible grouping.
    Returns data suitable for charts: bar (LOB), pie (source), heat map (zip/county), line (monthly).
    """
    if not date_from:
        date_from = date.today().replace(month=1, day=1)
    if not date_to:
        date_to = date.today()

    # Group column mapping
    group_col_map = {
        "lob": SalesLogEntry.line_of_business,
        "source": SalesLogEntry.source,
        "zip": SalesLogEntry.zip_code,
        "county": SalesLogEntry.county,
        "carrier": SalesLogEntry.carrier_id,
        "sale_type": SalesLogEntry.sale_type,
    }
    group_col = group_col_map[group_by]

    # Period grouping
    if period == "daily":
        period_col = SalesLogEntry.date
    elif period == "weekly":
        period_col = func.date_trunc("week", SalesLogEntry.date)
    else:
        period_col = func.date_trunc("month", SalesLogEntry.date)

    query = (
        select(
            period_col.label("period"),
            group_col.label("group_key"),
            func.count(SalesLogEntry.id).label("count"),
            func.sum(SalesLogEntry.premium).label("premium"),
        )
        .where(and_(SalesLogEntry.date >= date_from, SalesLogEntry.date <= date_to))
        .group_by("period", "group_key")
        .order_by("period")
    )

    result = await db.execute(query)
    rows = result.all()

    trends = []
    for row in rows:
        trends.append({
            "period": str(row.period) if row.period else None,
            "group": str(row.group_key) if row.group_key else "Unknown",
            "count": row.count,
            "premium": float(row.premium) if row.premium else 0,
        })

    return {"trends": trends, "period": period, "group_by": group_by}
