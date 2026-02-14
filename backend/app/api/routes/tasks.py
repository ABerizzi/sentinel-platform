"""
Task endpoints: CRUD, my tasks, filtered views.
"""
import uuid
from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Task
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.services.audit import audit_create, audit_update

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    assigned_to: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_before: Optional[date] = None,
    linked_entity_type: Optional[str] = None,
    linked_entity_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Task)

    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)
    if status:
        query = query.where(Task.status == status)
    else:
        query = query.where(Task.status.in_(["Open", "In Progress"]))
    if priority:
        query = query.where(Task.priority == priority)
    if due_before:
        query = query.where(Task.due_date <= due_before)
    if linked_entity_type and linked_entity_id:
        query = query.where(
            and_(Task.linked_entity_type == linked_entity_type, Task.linked_entity_id == linked_entity_id)
        )

    query = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(query.limit(100))
    tasks = result.scalars().all()

    return TaskListResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
    )


@router.get("/my", response_model=TaskListResponse)
async def my_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tasks assigned to or created by the current user."""
    query = select(Task).where(
        or_(Task.assigned_to == current_user.id, Task.created_by == current_user.id)
    )
    if status:
        query = query.where(Task.status == status)
    else:
        query = query.where(Task.status.in_(["Open", "In Progress"]))
    if priority:
        query = query.where(Task.priority == priority)

    query = query.order_by(Task.due_date.asc().nullslast())
    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=len(tasks),
    )


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    body: TaskCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create tasks")

    task = Task(**body.model_dump(), created_by=current_user.id)
    if not task.assigned_to:
        task.assigned_to = current_user.id
    db.add(task)
    await db.flush()

    await audit_create(db, current_user.id, "Task", task.id,
                       ip=request.client.host if request.client else None)
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot update tasks")

    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(task, field)
        if old_value != value:
            if field == "status" and value == "Completed":
                task.completed_at = datetime.utcnow()
            await audit_update(db, current_user.id, "Task", task.id, field, str(old_value), str(value),
                               ip=request.client.host if request.client else None)
            setattr(task, field, value)

    await db.flush()
    return TaskResponse.model_validate(task)
