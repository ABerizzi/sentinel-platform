"""
Notes and Communication Log endpoints.
Polymorphic — can be linked to any entity (Account, Policy, Prospect, etc.)
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, Note, CommunicationLog
from app.schemas.schemas import NoteCreate, NoteResponse, CommLogCreate, CommLogResponse
from app.services.audit import audit_create

router = APIRouter(tags=["Notes & Communications"])


# ========== NOTES ==========

@router.get("/notes", response_model=list[NoteResponse])
async def list_notes(
    linked_entity_type: str = Query(...),
    linked_entity_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note)
        .where(and_(Note.linked_entity_type == linked_entity_type, Note.linked_entity_id == linked_entity_id))
        .order_by(Note.created_at.desc())
    )
    return [NoteResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create notes")

    note = Note(**body.model_dump(), created_by=current_user.id)
    db.add(note)
    await db.flush()
    await audit_create(db, current_user.id, "Note", note.id)
    return NoteResponse.model_validate(note)


# ========== COMMUNICATION LOG ==========

@router.get("/comm-logs", response_model=list[CommLogResponse])
async def list_comm_logs(
    linked_entity_type: str = Query(...),
    linked_entity_id: uuid.UUID = Query(...),
    channel: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(CommunicationLog).where(
        and_(
            CommunicationLog.linked_entity_type == linked_entity_type,
            CommunicationLog.linked_entity_id == linked_entity_id,
        )
    )
    if channel:
        query = query.where(CommunicationLog.channel == channel)
    query = query.order_by(CommunicationLog.logged_at.desc())

    result = await db.execute(query)
    return [CommLogResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/comm-logs", response_model=CommLogResponse, status_code=201)
async def create_comm_log(
    body: CommLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "ReadOnly":
        raise HTTPException(status_code=403, detail="Read-only users cannot log communications")

    log = CommunicationLog(**body.model_dump(), user_id=current_user.id)
    db.add(log)
    await db.flush()
    await audit_create(db, current_user.id, "CommunicationLog", log.id)
    return CommLogResponse.model_validate(log)
