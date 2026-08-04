"""API keys, audit logs, and usage/quota endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permission
from app.db.session import get_db
from app.models import ApiKey, AuditLog
from app.services.api_keys import generate_api_key
from app.services.audit import write_audit
from app.services.quotas import get_or_create_quota

router = APIRouter(prefix="/api/v1", tags=["ops-security"])


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime]
    revoked_at: Optional[datetime]


class ApiKeyCreated(ApiKeyOut):
    api_key: str  # plaintext shown once


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: Optional[uuid.UUID]
    action: str
    resource_type: str
    resource_id: Optional[str]
    metadata_json: dict[str, Any]
    correlation_id: Optional[str]
    created_at: datetime


class UsageOut(BaseModel):
    organization_id: uuid.UUID
    max_concurrent_executions: int
    monthly_execution_quota: int
    monthly_token_quota: int
    requests_per_minute: int
    executions_used_month: int
    tokens_used_month: int
    executions_remaining: int
    tokens_remaining: int


@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("apikey:manage"))],
) -> list[ApiKey]:
    result = await db.execute(
        select(ApiKey)
        .where(
            ApiKey.organization_id == ctx.organization_id,
            ApiKey.revoked_at.is_(None),
        )
        .order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("apikey:manage"))],
) -> ApiKeyCreated:
    plaintext, prefix, key_hash = generate_api_key()
    row = ApiKey(
        organization_id=ctx.organization_id,
        name=body.name,
        key_prefix=prefix,
        key_hash=key_hash,
        created_by=ctx.user_id,
    )
    db.add(row)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=ctx.user_id,
        action="apikey.create",
        resource_type="api_key",
        resource_id=prefix,
        correlation_id=ctx.correlation_id,
    )
    await db.commit()
    await db.refresh(row)
    return ApiKeyCreated(
        id=row.id,
        name=row.name,
        key_prefix=row.key_prefix,
        created_at=row.created_at,
        last_used_at=row.last_used_at,
        revoked_at=row.revoked_at,
        api_key=plaintext,
    )


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("apikey:manage"))],
) -> Response:
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.organization_id == ctx.organization_id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    row.revoked_at = datetime.now(timezone.utc)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=ctx.user_id,
        action="apikey.revoke",
        resource_type="api_key",
        resource_id=str(row.id),
        correlation_id=ctx.correlation_id,
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("audit:view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> list[AuditLog]:
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.organization_id == ctx.organization_id)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all())


@router.get("/usage", response_model=UsageOut)
async def get_usage(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("usage:view"))],
) -> UsageOut:
    quota = await get_or_create_quota(db, ctx.organization_id)
    await db.commit()
    return UsageOut(
        organization_id=quota.organization_id,
        max_concurrent_executions=quota.max_concurrent_executions,
        monthly_execution_quota=quota.monthly_execution_quota,
        monthly_token_quota=quota.monthly_token_quota,
        requests_per_minute=quota.requests_per_minute,
        executions_used_month=quota.executions_used_month,
        tokens_used_month=quota.tokens_used_month,
        executions_remaining=max(0, quota.monthly_execution_quota - quota.executions_used_month),
        tokens_remaining=max(0, quota.monthly_token_quota - quota.tokens_used_month),
    )
