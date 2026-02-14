"""
Audit logging service. Every state-changing operation must call this.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog


async def write_audit_log(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    field_changed: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    """Write an immutable audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata_json=metadata,
    )
    db.add(entry)
    # Don't commit here — let the request's session handle it


async def audit_create(db, user_id, entity_type, entity_id, ip=None, ua=None, meta=None):
    await write_audit_log(db, user_id, "Create", entity_type, entity_id, ip_address=ip, user_agent=ua, metadata=meta)


async def audit_update(db, user_id, entity_type, entity_id, field, old_val, new_val, ip=None, ua=None):
    await write_audit_log(db, user_id, "Update", entity_type, entity_id, field, old_val, new_val, ip, ua)


async def audit_delete(db, user_id, entity_type, entity_id, ip=None, ua=None):
    await write_audit_log(db, user_id, "Delete", entity_type, entity_id, ip_address=ip, user_agent=ua)
