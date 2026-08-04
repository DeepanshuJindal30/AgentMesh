"""Organization quota enforcement."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Execution, ExecutionStatus, OrganizationQuota


ACTIVE_STATUSES = (
    ExecutionStatus.QUEUED,
    ExecutionStatus.RUNNING,
    ExecutionStatus.RETRYING,
    ExecutionStatus.CANCEL_REQUESTED,
)


async def get_or_create_quota(db: AsyncSession, organization_id: uuid.UUID) -> OrganizationQuota:
    result = await db.execute(
        select(OrganizationQuota).where(OrganizationQuota.organization_id == organization_id)
    )
    quota = result.scalar_one_or_none()
    if quota is None:
        quota = OrganizationQuota(organization_id=organization_id)
        db.add(quota)
        await db.flush()
    return quota


async def enforce_execution_quotas(db: AsyncSession, organization_id: uuid.UUID) -> OrganizationQuota:
    quota = await get_or_create_quota(db, organization_id)

    concurrent = await db.scalar(
        select(func.count())
        .select_from(Execution)
        .where(
            Execution.organization_id == organization_id,
            Execution.status.in_(ACTIVE_STATUSES),
        )
    )
    if int(concurrent or 0) >= quota.max_concurrent_executions:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Concurrent execution quota exceeded",
            headers={"Retry-After": "30"},
        )

    if quota.executions_used_month >= quota.monthly_execution_quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Monthly execution quota exceeded",
            headers={"Retry-After": "3600"},
        )

    if quota.tokens_used_month >= quota.monthly_token_quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Monthly token quota exceeded",
            headers={"Retry-After": "3600"},
        )
    return quota


async def increment_execution_usage(db: AsyncSession, organization_id: uuid.UUID) -> None:
    quota = await get_or_create_quota(db, organization_id)
    quota.executions_used_month += 1
    await db.flush()
