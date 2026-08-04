"""FastAPI dependency for Redis rate limiting."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Response, status

from app.core.auth import AuthContext, get_auth_context
from app.observability.metrics import RATE_LIMITED
from app.services.quotas import get_or_create_quota
from app.services.rate_limit import check_rate_limit
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession


async def enforce_user_rate_limit(
    response: Response,
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthContext:
    quota = await get_or_create_quota(db, ctx.organization_id)
    result = check_rate_limit(
        bucket=f"user:{ctx.user_id}",
        limit=quota.requests_per_minute,
        window_seconds=60,
    )
    response.headers["X-RateLimit-Limit"] = str(quota.requests_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(result.remaining)
    if not result.allowed:
        RATE_LIMITED.labels("user").inc()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(result.retry_after)},
        )
    return ctx
