"""Agent CRUD and immutable versioning."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permission
from app.core.rate_limit_dep import enforce_user_rate_limit
from app.core.tenancy import get_tenant_or_404
from app.db.session import get_db
from app.models import Agent, AgentVersion, AgentVersionStatus
from app.schemas import AgentCreate, AgentOut, AgentVersionCreate, AgentVersionOut
from app.services.audit import write_audit

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("", response_model=list[AgentOut])
async def list_agents(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[Agent]:
    result = await db.execute(
        select(Agent)
        .where(Agent.organization_id == ctx.organization_id)
        .order_by(Agent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all())


@router.post("", response_model=AgentOut, status_code=201)
async def create_agent(
    body: AgentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:create"))],
    _: Annotated[AuthContext, Depends(enforce_user_rate_limit)],
) -> Agent:
    agent = Agent(
        organization_id=ctx.organization_id,
        name=body.name,
        description=body.description,
        created_by=ctx.user_id,
    )
    db.add(agent)
    await db.flush()
    version = AgentVersion(
        organization_id=ctx.organization_id,
        agent_id=agent.id,
        version_number=1,
        status=AgentVersionStatus.DRAFT,
        configuration=body.configuration
        or {
            "type": "ticket_similarity",
            "top_k": 5,
            "provider": "mock",
        },
    )
    db.add(version)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=ctx.user_id,
        action="agent.create",
        resource_type="agent",
        resource_id=str(agent.id),
        metadata={"name": body.name},
        correlation_id=ctx.correlation_id,
    )
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(
    agent_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:view"))],
) -> Agent:
    return await get_tenant_or_404(db, Agent, agent_id, ctx)


@router.get("/{agent_id}/versions", response_model=list[AgentVersionOut])
async def list_versions(
    agent_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:view"))],
) -> list[AgentVersion]:
    await get_tenant_or_404(db, Agent, agent_id, ctx)
    result = await db.execute(
        select(AgentVersion)
        .where(
            AgentVersion.agent_id == agent_id,
            AgentVersion.organization_id == ctx.organization_id,
        )
        .order_by(AgentVersion.version_number.desc())
    )
    return list(result.scalars().all())


@router.post("/{agent_id}/versions", response_model=AgentVersionOut, status_code=201)
async def create_version(
    agent_id: uuid.UUID,
    body: AgentVersionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:create"))],
) -> AgentVersion:
    await get_tenant_or_404(db, Agent, agent_id, ctx)
    max_v = await db.scalar(
        select(func.max(AgentVersion.version_number)).where(
            AgentVersion.agent_id == agent_id,
            AgentVersion.organization_id == ctx.organization_id,
        )
    )
    version = AgentVersion(
        organization_id=ctx.organization_id,
        agent_id=agent_id,
        version_number=(max_v or 0) + 1,
        status=AgentVersionStatus.DRAFT,
        configuration=body.configuration,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version


@router.post("/{agent_id}/publish", response_model=AgentVersionOut)
async def publish_version(
    agent_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:publish"))],
    version_id: uuid.UUID | None = None,
) -> AgentVersion:
    """Publish a draft version. Published versions are immutable thereafter."""
    await get_tenant_or_404(db, Agent, agent_id, ctx)
    stmt = select(AgentVersion).where(
        AgentVersion.agent_id == agent_id,
        AgentVersion.organization_id == ctx.organization_id,
    )
    if version_id:
        stmt = stmt.where(AgentVersion.id == version_id)
    else:
        stmt = stmt.where(AgentVersion.status == AgentVersionStatus.DRAFT).order_by(
            AgentVersion.version_number.desc()
        )
    result = await db.execute(stmt)
    version = result.scalars().first()
    if version is None:
        raise HTTPException(status_code=404, detail="No draft version to publish")
    if version.status == AgentVersionStatus.PUBLISHED:
        raise HTTPException(status_code=409, detail="Version already published")
    version.status = AgentVersionStatus.PUBLISHED
    version.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(version)
    return version
