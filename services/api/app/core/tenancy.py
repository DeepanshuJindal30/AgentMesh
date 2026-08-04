"""Tenant-scoped query helpers — never trust client organization_id alone."""

from __future__ import annotations

import uuid
from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext
from app.db.base import Base

T = TypeVar("T", bound=Base)


def tenant_filter(stmt: Select[tuple[T]], organization_id: uuid.UUID) -> Select[tuple[T]]:
    """Apply organization_id filter to a tenant-owned model query."""
    model = stmt.column_descriptions[0]["entity"]
    return stmt.where(model.organization_id == organization_id)


async def get_tenant_or_404(
    db: AsyncSession,
    model: type[T],
    record_id: uuid.UUID,
    ctx: AuthContext,
) -> T:
    """
    Load a tenant-owned row. Cross-tenant or missing IDs return 404
    (avoid leaking existence across organizations).
    """
    result = await db.execute(
        select(model).where(
            model.id == record_id,  # type: ignore[attr-defined]
            model.organization_id == ctx.organization_id,  # type: ignore[attr-defined]
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row
