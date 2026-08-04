"""Sync DB helpers for Celery workers."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import create_engine, select, text, update
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = (
    os.getenv(
        "DATABASE_URL_SYNC",
        os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://agentmesh:agentmesh_dev_password@localhost:5432/agentmesh",
        ),
    )
    .replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    .replace("postgres://", "postgresql+psycopg2://")
)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len("postgresql://") :]

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def claim_execution(session: Session, execution_id: str, worker_id: str) -> Optional[dict[str, Any]]:
    """
    Atomically transition QUEUED/RETRYING -> RUNNING.
    Returns None if already claimed/terminal (duplicate delivery protection).
    """
    now = datetime.now(timezone.utc)
    result = session.execute(
        text(
            """
            UPDATE executions
            SET status = 'RUNNING',
                worker_id = :worker_id,
                started_at = COALESCE(started_at, :now),
                updated_at = :now
            WHERE id = CAST(:execution_id AS uuid)
              AND status IN ('QUEUED', 'RETRYING')
            RETURNING id::text, organization_id::text, agent_id::text, agent_version_id::text,
                      status, input_payload, correlation_id, retry_count, max_retries
            """
        ),
        {"execution_id": execution_id, "worker_id": worker_id, "now": now},
    )
    row = result.mappings().first()
    session.commit()
    return dict(row) if row else None


def load_agent_version(session: Session, version_id: str) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            SELECT id::text, configuration, status
            FROM agent_versions
            WHERE id = CAST(:id AS uuid)
            """
        ),
        {"id": version_id},
    ).mappings().one()
    return dict(row)


def insert_event(
    session: Session,
    *,
    organization_id: str,
    execution_id: str,
    sequence_number: int,
    event_type: str,
    message: str,
    payload: dict[str, Any],
    is_terminal: bool,
    error_code: str | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO execution_events (
                id, organization_id, execution_id, sequence_number, event_type,
                message, payload, is_terminal, error_code, created_at, updated_at
            ) VALUES (
                :id, CAST(:organization_id AS uuid), CAST(:execution_id AS uuid),
                :sequence_number, :event_type, :message, CAST(:payload AS jsonb),
                :is_terminal, :error_code, NOW(), NOW()
            )
            ON CONFLICT (execution_id, sequence_number) DO NOTHING
            RETURNING id::text, sequence_number, event_type, message, payload, is_terminal, error_code, created_at
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "organization_id": organization_id,
            "execution_id": execution_id,
            "sequence_number": sequence_number,
            "event_type": event_type,
            "message": message,
            "payload": json_dumps(payload),
            "is_terminal": is_terminal,
            "error_code": error_code,
        },
    ).mappings().first()
    session.commit()
    return dict(row) if row else {
        "sequence_number": sequence_number,
        "event_type": event_type,
        "message": message,
        "payload": payload,
        "is_terminal": is_terminal,
        "error_code": error_code,
    }


def json_dumps(payload: dict[str, Any]) -> str:
    import json

    return json.dumps(payload)


def finalize_execution(
    session: Session,
    *,
    execution_id: str,
    status: str,
    output_payload: dict[str, Any] | None,
    error_details: dict[str, Any] | None,
    token_usage_total: int,
) -> None:
    session.execute(
        text(
            """
            UPDATE executions
            SET status = :status,
                output_payload = CAST(:output AS jsonb),
                error_details = CAST(:error AS jsonb),
                token_usage_total = :tokens,
                finished_at = NOW(),
                updated_at = NOW()
            WHERE id = CAST(:execution_id AS uuid)
            """
        ),
        {
            "status": status,
            "output": json_dumps(output_payload or {}),
            "error": json_dumps(error_details or {}),
            "tokens": token_usage_total,
            "execution_id": execution_id,
        },
    )
    session.commit()


def mark_retry_or_dead(session: Session, execution_id: str, retry_count: int, max_retries: int, error: str) -> str:
    if retry_count + 1 >= max_retries:
        status = "DEAD_LETTERED"
        session.execute(
            text(
                """
                UPDATE executions
                SET status = 'DEAD_LETTERED',
                    retry_count = :retry_count,
                    error_details = CAST(:error AS jsonb),
                    finished_at = NOW(),
                    updated_at = NOW()
                WHERE id = CAST(:execution_id AS uuid)
                """
            ),
            {
                "execution_id": execution_id,
                "retry_count": retry_count + 1,
                "error": json_dumps({"message": error}),
            },
        )
    else:
        status = "RETRYING"
        session.execute(
            text(
                """
                UPDATE executions
                SET status = 'RETRYING',
                    retry_count = :retry_count,
                    error_details = CAST(:error AS jsonb),
                    updated_at = NOW()
                WHERE id = CAST(:execution_id AS uuid)
                """
            ),
            {
                "execution_id": execution_id,
                "retry_count": retry_count + 1,
                "error": json_dumps({"message": error}),
            },
        )
    session.commit()
    return status


def is_cancel_requested(session: Session, execution_id: str) -> bool:
    status = session.execute(
        text("SELECT status FROM executions WHERE id = CAST(:id AS uuid)"),
        {"id": execution_id},
    ).scalar_one()
    return status == "CANCEL_REQUESTED"
