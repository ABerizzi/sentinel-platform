"""
Dashboard endpoint: aggregated view of everything that matters today.
Tasks due, service items, installments, pipeline snapshot, sales quota.
"""
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import (
    User, Task, ServiceItem, Installment, Prospect, SalesLogEntry, Policy
)
from app.schemas.schemas import DashboardResponse, TaskResponse, ServiceItemResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    week_end = today + timedelta(days=(6 - today.weekday()))
    month_start = today.replace(day=1)

    # ---------- TASKS ----------
    tasks_due_today_q = select(func.count(Task.id)).where(
        and_(Task.due_date == today, Task.status.in_(["Open", "In Progress"]))
    )
    tasks_due_today = (await db.execute(tasks_due_today_q)).scalar() or 0

    tasks_overdue_q = select(func.count(Task.id)).where(
        and_(Task.due_date < today, Task.status.in_(["Open", "In Progress"]))
    )
    tasks_overdue = (await db.execute(tasks_overdue_q)).scalar() or 0

    # Recent tasks for the widget
    recent_tasks_q = (
        select(Task)
        .where(Task.status.in_(["Open", "In Progress"]))
        .order_by(Task.due_date.asc().nullslast())
        .limit(10)
    )
    recent_tasks = (await db.execute(recent_tasks_q)).scalars().all()

    # ---------- SERVICE ITEMS ----------
    si_due_week_q = select(func.count(ServiceItem.id)).where(
        and_(
            ServiceItem.due_date <= week_end,
            ServiceItem.due_date >= today,
            ServiceItem.status.notin_(["Completed", "Closed"]),
        )
    )
    si_due_week = (await db.execute(si_due_week_q)).scalar() or 0

    si_overdue_q = select(func.count(ServiceItem.id)).where(
        and_(
            ServiceItem.due_date < today,
            ServiceItem.status.notin_(["Completed", "Closed"]),
        )
    )
    si_overdue = (await db.execute(si_overdue_q)).scalar() or 0

    # Recent service items for widget
    recent_si_q = (
        select(ServiceItem)
        .where(ServiceItem.status.notin_(["Completed", "Closed"]))
        .order_by(ServiceItem.due_date.asc().nullslast())
        .limit(10)
    )
    recent_service_items = (await db.execute(recent_si_q)).scalars().all()

    # ---------- INSTALLMENTS ----------
    inst_due_week_q = select(func.count(Installment.id)).where(
        and_(
            Installment.due_date <= week_end,
            Installment.due_date >= today,
            Installment.status.in_(["Scheduled", "Reminded"]),
        )
    )
    inst_due_week = (await db.execute(inst_due_week_q)).scalar() or 0

    inst_past_due_q = select(func.count(Installment.id)).where(
        and_(Installment.due_date < today, Installment.status.in_(["Scheduled", "Reminded"]))
    )
    inst_past_due = (await db.execute(inst_past_due_q)).scalar() or 0

    # ---------- PIPELINE ----------
    pipeline_q = select(
        func.count(Prospect.id),
        func.coalesce(func.sum(Prospect.estimated_premium), 0),
    ).where(Prospect.pipeline_stage.notin_(["Closed-Won", "Closed-Lost"]))
    pipeline_row = (await db.execute(pipeline_q)).one()

    # ---------- SALES THIS MONTH ----------
    sales_q = select(
        func.count(SalesLogEntry.id),
        func.coalesce(func.sum(SalesLogEntry.premium), 0),
    ).where(SalesLogEntry.date >= month_start)
    sales_row = (await db.execute(sales_q)).one()

    # Allstate auto items quota
    auto_q = select(func.count(SalesLogEntry.id)).where(
        and_(
            SalesLogEntry.date >= month_start,
            SalesLogEntry.line_of_business == "Personal Auto",
            SalesLogEntry.sale_type.in_(["New Business", "Rewrite"]),
        )
    )
    auto_items = (await db.execute(auto_q)).scalar() or 0

    return DashboardResponse(
        tasks_due_today=tasks_due_today,
        tasks_overdue=tasks_overdue,
        service_items_due_this_week=si_due_week,
        service_items_overdue=si_overdue,
        installments_due_this_week=inst_due_week,
        installments_past_due=inst_past_due,
        pipeline_value=Decimal(str(pipeline_row[1])),
        pipeline_count=pipeline_row[0],
        sales_this_month=sales_row[0],
        sales_premium_this_month=Decimal(str(sales_row[1])),
        auto_items_this_month=auto_items,
        recent_tasks=[TaskResponse.model_validate(t) for t in recent_tasks],
        recent_service_items=[ServiceItemResponse.model_validate(si) for si in recent_service_items],
    )
