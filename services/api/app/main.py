"""AgentMesh API — FastAPI application entrypoint."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.bootstrap import bootstrap_database
from app.observability.metrics import mount_metrics

SERVICE_NAME = os.getenv("SERVICE_NAME", "api")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
VERSION = "0.3.0"

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("agentmesh.api")


class HealthResponse(BaseModel):
    status: str = Field(description="liveness status")
    service: str
    version: str
    timestamp: datetime


class ReadyResponse(BaseModel):
    status: str
    service: str
    checks: dict[str, str]
    timestamp: datetime


async def _check_postgres() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return "skipped"
    try:
        import asyncpg

        dsn = database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn=dsn, timeout=2)
        try:
            await conn.fetchval("SELECT 1")
        finally:
            await conn.close()
        return "ok"
    except Exception as exc:  # noqa: BLE001
        return f"error:{type(exc).__name__}"


async def _check_redis() -> str:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return "skipped"
    try:
        from redis.asyncio import Redis

        client = Redis.from_url(redis_url, socket_connect_timeout=2)
        try:
            pong = await client.ping()
            return "ok" if pong else "error:no_pong"
        finally:
            await client.aclose()
    except Exception as exc:  # noqa: BLE001
        return f"error:{type(exc).__name__}"


async def _check_rabbitmq() -> str:
    rabbit_url = os.getenv("RABBITMQ_URL") or os.getenv("CELERY_BROKER_URL")
    if not rabbit_url:
        return "skipped"
    try:
        import aio_pika

        connection = await aio_pika.connect_robust(rabbit_url, timeout=2)
        await connection.close()
        return "ok"
    except Exception as exc:  # noqa: BLE001
        return f"error:{type(exc).__name__}"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    try:
        await bootstrap_database()
    except Exception:
        logger.exception("database bootstrap failed")
        raise
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="AgentMesh API",
        description="Multi-tenant AI agent execution platform API",
        version=VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse, tags=["ops"])
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service=SERVICE_NAME,
            version=VERSION,
            timestamp=datetime.now(timezone.utc),
        )

    @app.get("/ready", response_model=ReadyResponse, tags=["ops"])
    async def ready(response: Response) -> ReadyResponse:
        checks = {
            "postgres": await _check_postgres(),
            "redis": await _check_redis(),
            "rabbitmq": await _check_rabbitmq(),
        }
        failing = [name for name, value in checks.items() if value.startswith("error")]
        is_ready = len(failing) == 0
        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadyResponse(
            status="ok" if is_ready else "degraded",
            service=SERVICE_NAME,
            checks=checks,
            timestamp=datetime.now(timezone.utc),
        )

    @app.get("/api/v1/system/info", tags=["ops"])
    async def system_info() -> dict[str, Any]:
        return {
            "service": SERVICE_NAME,
            "version": VERSION,
            "environment": ENVIRONMENT,
            "phase": "production-readiness",
        }

    app.include_router(api_router)
    mount_metrics(app)
    return app


app = create_app()
