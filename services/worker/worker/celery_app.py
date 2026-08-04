"""Celery app + durable execution task."""

from __future__ import annotations

import json
import logging
import os
import socket
from typing import Any

import redis
from celery import Celery
from kombu import Exchange, Queue
from sqlalchemy import text

from worker.db import (
    SessionLocal,
    claim_execution,
    finalize_execution,
    insert_event,
    is_cancel_requested,
    load_agent_version,
    mark_retry_or_dead,
)
from worker.runtime_client import run_execution_stream

logger = logging.getLogger("agentmesh.worker")

SERVICE_NAME = os.getenv("SERVICE_NAME", "worker")
BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
EXECUTIONS_QUEUE = "agentmesh.executions"
WORKER_ID = f"{SERVICE_NAME}@{socket.gethostname()}"

celery_app = Celery("agentmesh", broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.task_queues = (
    Queue(
        EXECUTIONS_QUEUE,
        Exchange(""),
        routing_key=EXECUTIONS_QUEUE,
        queue_arguments={
            "x-dead-letter-exchange": "agentmesh.dlx",
            "x-dead-letter-routing-key": "executions.dead",
        },
    ),
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_default_queue=EXECUTIONS_QUEUE,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_soft_time_limit=110,
    task_time_limit=120,
)


def _publish(execution_id: str, event: dict[str, Any]) -> None:
    client = redis.Redis.from_url(REDIS_URL)
    try:
        client.publish(f"execution:{execution_id}:events", json.dumps(event, default=str))
    finally:
        client.close()


@celery_app.task(name="agentmesh.health.ping")
def ping() -> dict[str, str]:
    return {"status": "ok", "service": SERVICE_NAME}


@celery_app.task(
    name="agentmesh.executions.run",
    bind=True,
    max_retries=3,
    autoretry_for=(ConnectionError, TimeoutError, OSError),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
)
def run_execution(self, execution_id: str) -> dict[str, Any]:
    """
    At-least-once consumer:
    1) Atomic claim via DB status transition
    2) Stream gRPC runtime events
    3) Persist + publish each event
    """
    session = SessionLocal()
    try:
        claimed = claim_execution(session, execution_id, WORKER_ID)
        if claimed is None:
            logger.info("skip duplicate/non-claimable execution_id=%s", execution_id)
            return {"status": "skipped", "execution_id": execution_id}

        version = load_agent_version(session, claimed["agent_version_id"])
        input_payload = claimed["input_payload"]
        if isinstance(input_payload, str):
            input_payload = json.loads(input_payload)
        configuration = version["configuration"]
        if isinstance(configuration, str):
            configuration = json.loads(configuration)

        request = {
            "execution_id": execution_id,
            "organization_id": claimed["organization_id"],
            "agent_version_id": claimed["agent_version_id"],
            "agent_configuration": json.dumps(configuration),
            "user_input": json.dumps(input_payload),
            "timeout_seconds": 90,
            "correlation_id": claimed["correlation_id"],
        }

        tokens = 0
        final_payload: dict[str, Any] | None = None
        terminal_type = "SUCCEEDED"
        error_code = ""

        try:
            for event in run_execution_stream(request):
                if is_cancel_requested(session, execution_id):
                    finalize_execution(
                        session,
                        execution_id=execution_id,
                        status="CANCELLED",
                        output_payload=None,
                        error_details={"message": "Cancelled by user"},
                        token_usage_total=tokens,
                    )
                    cancel_event = {
                        "sequence_number": int(event.get("sequence_number", 0)) + 1,
                        "event_type": "CANCELLED",
                        "message": "Execution cancelled",
                        "payload": {},
                        "is_terminal": True,
                    }
                    _publish(execution_id, cancel_event)
                    return {"status": "CANCELLED", "execution_id": execution_id}

                usage = event.get("token_usage") or {}
                tokens += int(usage.get("total_tokens") or 0)
                payload = json.loads(event.get("payload_json") or "{}")
                stored = insert_event(
                    session,
                    organization_id=claimed["organization_id"],
                    execution_id=execution_id,
                    sequence_number=int(event["sequence_number"]),
                    event_type=event["event_type"],
                    message=event.get("message") or "",
                    payload=payload,
                    is_terminal=bool(event.get("is_terminal")),
                    error_code=event.get("error_code") or None,
                )
                _publish(execution_id, {
                    "id": stored.get("id"),
                    "sequence_number": stored["sequence_number"],
                    "event_type": stored["event_type"],
                    "message": stored["message"],
                    "payload": payload,
                    "is_terminal": stored["is_terminal"],
                    "error_code": stored.get("error_code"),
                    "worker_id": WORKER_ID,
                })

                if event.get("is_terminal"):
                    terminal_type = event["event_type"]
                    error_code = event.get("error_code") or ""
                    if terminal_type == "SUCCEEDED":
                        final_payload = payload
                    break
        except Exception as exc:
            logger.exception("execution failed execution_id=%s", execution_id)
            status = mark_retry_or_dead(
                session,
                execution_id,
                int(claimed["retry_count"]),
                int(claimed["max_retries"]),
                str(exc),
            )
            if status == "RETRYING":
                raise self.retry(exc=exc, countdown=2 ** self.request.retries)
            return {"status": status, "execution_id": execution_id}

        if terminal_type == "SUCCEEDED":
            finalize_execution(
                session,
                execution_id=execution_id,
                status="SUCCEEDED",
                output_payload=final_payload,
                error_details=None,
                token_usage_total=tokens,
            )
            return {"status": "SUCCEEDED", "execution_id": execution_id}

        if terminal_type == "FAILED" and error_code == "CONTROLLED_FAILURE":
            # Demo path: first failure retries once with force_fail removed so it can succeed.
            cleaned = dict(input_payload)
            cleaned.pop("force_fail", None)
            session.execute(
                text(
                    """
                    UPDATE executions
                    SET input_payload = CAST(:payload AS jsonb),
                        status = 'QUEUED',
                        retry_count = retry_count + 1,
                        updated_at = NOW()
                    WHERE id = CAST(:execution_id AS uuid)
                    """
                ),
                {"payload": json.dumps(cleaned), "execution_id": execution_id},
            )
            session.commit()
            if int(claimed["retry_count"]) + 1 >= int(claimed["max_retries"]):
                finalize_execution(
                    session,
                    execution_id=execution_id,
                    status="DEAD_LETTERED",
                    output_payload=None,
                    error_details={"error_code": error_code},
                    token_usage_total=tokens,
                )
                return {"status": "DEAD_LETTERED", "execution_id": execution_id}
            raise self.retry(countdown=2)

        finalize_execution(
            session,
            execution_id=execution_id,
            status="FAILED",
            output_payload=None,
            error_details={"error_code": error_code or terminal_type},
            token_usage_total=tokens,
        )
        return {"status": "FAILED", "execution_id": execution_id}
    finally:
        session.close()
