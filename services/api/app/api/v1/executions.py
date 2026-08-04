"""Execution submission, events, SSE, cancel, retry."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import datetime
from typing import Annotated, Any, AsyncIterator, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permission
from app.core.tenancy import get_tenant_or_404
from app.db.session import get_db
from app.models import (
    Agent,
    AgentVersion,
    AgentVersionStatus,
    Execution,
    ExecutionEvent,
    ExecutionStatus,
    IdempotencyKey,
)
from app.schemas import ExecutionCreate, ExecutionOut
from app.services.audit import write_audit
from app.services.events import execution_channel, get_redis
from app.services.queue import enqueue_execution
from app.services.quotas import enforce_execution_quotas, increment_execution_usage
from app.observability.metrics import EXECUTION_SUBMITTED
from app.core.rate_limit_dep import enforce_user_rate_limit

router = APIRouter(prefix="/api/v1/executions", tags=["executions"])


class ExecutionEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    execution_id: uuid.UUID
    sequence_number: int
    event_type: str
    message: str
    payload: dict[str, Any]
    is_terminal: bool
    error_code: Optional[str]
    created_at: datetime


def _payload_hash(body: ExecutionCreate) -> str:
    raw = json.dumps(body.model_dump(mode="json"), sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("", response_model=list[ExecutionOut])
async def list_executions(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
) -> list[Execution]:
    stmt = select(Execution).where(Execution.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(Execution.status == status_filter)
    stmt = (
        stmt.order_by(Execution.queued_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=ExecutionOut, status_code=status.HTTP_202_ACCEPTED)
async def create_execution(
    body: ExecutionCreate,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:run"))],
    _: Annotated[AuthContext, Depends(enforce_user_rate_limit)],
    idempotency_key: Annotated[Optional[str], Header(alias="Idempotency-Key")] = None,
) -> Execution:
    await get_tenant_or_404(db, Agent, body.agent_id, ctx)
    await enforce_execution_quotas(db, ctx.organization_id)

    if body.agent_version_id:
        version = await get_tenant_or_404(db, AgentVersion, body.agent_version_id, ctx)
        if version.agent_id != body.agent_id:
            raise HTTPException(status_code=400, detail="Version does not belong to agent")
    else:
        result = await db.execute(
            select(AgentVersion)
            .where(
                AgentVersion.agent_id == body.agent_id,
                AgentVersion.organization_id == ctx.organization_id,
                AgentVersion.status == AgentVersionStatus.PUBLISHED,
            )
            .order_by(AgentVersion.version_number.desc())
        )
        version = result.scalars().first()
        if version is None:
            raise HTTPException(status_code=400, detail="No published version available")

    req_hash = _payload_hash(body)
    if idempotency_key:
        existing = await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.organization_id == ctx.organization_id,
                IdempotencyKey.key == idempotency_key,
            )
        )
        idem = existing.scalar_one_or_none()
        if idem is not None:
            if idem.request_hash != req_hash:
                raise HTTPException(
                    status_code=409,
                    detail="Idempotency-Key reused with different payload",
                )
            execution = await get_tenant_or_404(db, Execution, idem.execution_id, ctx)
            response.status_code = status.HTTP_200_OK
            return execution

    execution = Execution(
        organization_id=ctx.organization_id,
        agent_id=body.agent_id,
        agent_version_id=version.id,
        requested_by=ctx.user_id,
        status=ExecutionStatus.QUEUED,
        input_payload=body.input_payload,
        correlation_id=ctx.correlation_id,
    )
    db.add(execution)
    await db.flush()

    if idempotency_key:
        db.add(
            IdempotencyKey(
                organization_id=ctx.organization_id,
                key=idempotency_key,
                request_hash=req_hash,
                execution_id=execution.id,
            )
        )

    await db.commit()
    await db.refresh(execution)
    await increment_execution_usage(db, ctx.organization_id)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=ctx.user_id,
        action="execution.submit",
        resource_type="execution",
        resource_id=str(execution.id),
        metadata={"agent_id": str(body.agent_id)},
        correlation_id=ctx.correlation_id,
    )
    await db.commit()
    EXECUTION_SUBMITTED.labels(str(ctx.organization_id)).inc()
    enqueue_execution(str(execution.id))
    return execution


@router.get("/{execution_id}", response_model=ExecutionOut)
async def get_execution(
    execution_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:view"))],
) -> Execution:
    return await get_tenant_or_404(db, Execution, execution_id, ctx)


@router.get("/{execution_id}/events", response_model=None)
async def list_execution_events(
    execution_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:view"))],
    request: Request,
) -> list[ExecutionEventOut] | StreamingResponse:
    """
    Dual-mode endpoint:
    - Accept: text/event-stream → SSE live feed (Redis Pub/Sub + DB catch-up)
    - Otherwise → historical JSON events
    """
    await get_tenant_or_404(db, Execution, execution_id, ctx)
    accept = request.headers.get("accept", "")
    if "text/event-stream" in accept:
        last_event_id = request.headers.get("last-event-id")
        return StreamingResponse(
            _sse_stream(execution_id, ctx.organization_id, last_event_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    result = await db.execute(
        select(ExecutionEvent)
        .where(
            ExecutionEvent.execution_id == execution_id,
            ExecutionEvent.organization_id == ctx.organization_id,
        )
        .order_by(ExecutionEvent.sequence_number.asc())
    )
    return list(result.scalars().all())


async def _sse_stream(
    execution_id: uuid.UUID,
    organization_id: uuid.UUID,
    last_event_id: str | None,
) -> AsyncIterator[str]:
    from app.db.session import SessionLocal

    after_seq = 0
    if last_event_id and last_event_id.isdigit():
        after_seq = int(last_event_id)

    async with SessionLocal() as db:
        result = await db.execute(
            select(ExecutionEvent)
            .where(
                ExecutionEvent.execution_id == execution_id,
                ExecutionEvent.organization_id == organization_id,
                ExecutionEvent.sequence_number > after_seq,
            )
            .order_by(ExecutionEvent.sequence_number.asc())
        )
        for event in result.scalars().all():
            payload = {
                "id": str(event.id),
                "sequence_number": event.sequence_number,
                "event_type": event.event_type,
                "message": event.message,
                "payload": event.payload,
                "is_terminal": event.is_terminal,
                "error_code": event.error_code,
            }
            yield f"id: {event.sequence_number}\ndata: {json.dumps(payload, default=str)}\n\n"
            after_seq = event.sequence_number
            if event.is_terminal:
                return

    client = get_redis()
    pubsub = client.pubsub()
    channel = execution_channel(str(execution_id))
    pubsub.subscribe(channel)
    try:
        while True:
            message = await asyncio.to_thread(
                pubsub.get_message, ignore_subscribe_messages=True, timeout=1.0
            )
            if message and message.get("type") == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                parsed = json.loads(data)
                seq = int(parsed.get("sequence_number") or 0)
                if seq <= after_seq:
                    continue
                after_seq = seq
                yield f"id: {seq}\ndata: {json.dumps(parsed, default=str)}\n\n"
                if parsed.get("is_terminal"):
                    return
            else:
                async with SessionLocal() as db:
                    result = await db.execute(
                        select(Execution).where(
                            Execution.id == execution_id,
                            Execution.organization_id == organization_id,
                        )
                    )
                    exec_row = result.scalar_one_or_none()
                    if exec_row and exec_row.status in {
                        ExecutionStatus.SUCCEEDED,
                        ExecutionStatus.FAILED,
                        ExecutionStatus.CANCELLED,
                        ExecutionStatus.DEAD_LETTERED,
                        ExecutionStatus.TIMED_OUT,
                    }:
                        yield (
                            "event: status\n"
                            f"data: {json.dumps({'status': exec_row.status.value})}\n\n"
                        )
                        return
                yield ": keepalive\n\n"
            await asyncio.sleep(0.05)
    finally:
        pubsub.unsubscribe(channel)
        pubsub.close()


@router.post("/{execution_id}/cancel", response_model=ExecutionOut)
async def cancel_execution(
    execution_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:cancel"))],
) -> Execution:
    execution = await get_tenant_or_404(db, Execution, execution_id, ctx)
    if execution.status in {
        ExecutionStatus.SUCCEEDED,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.DEAD_LETTERED,
    }:
        raise HTTPException(status_code=409, detail=f"Cannot cancel from {execution.status}")
    execution.status = ExecutionStatus.CANCEL_REQUESTED
    await db.commit()
    await db.refresh(execution)
    return execution


@router.post("/{execution_id}/retry", response_model=ExecutionOut, status_code=status.HTTP_202_ACCEPTED)
async def retry_execution(
    execution_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("execution:retry"))],
) -> Execution:
    execution = await get_tenant_or_404(db, Execution, execution_id, ctx)
    if execution.status not in {
        ExecutionStatus.FAILED,
        ExecutionStatus.DEAD_LETTERED,
        ExecutionStatus.TIMED_OUT,
    }:
        raise HTTPException(status_code=409, detail=f"Cannot retry from {execution.status}")
    # Clear controlled failure flag on manual retry
    payload = dict(execution.input_payload or {})
    payload.pop("force_fail", None)
    execution.input_payload = payload
    execution.status = ExecutionStatus.QUEUED
    execution.error_details = None
    execution.finished_at = None
    execution.started_at = None
    execution.worker_id = None
    await db.commit()
    await db.refresh(execution)
    enqueue_execution(str(execution.id))
    return execution
