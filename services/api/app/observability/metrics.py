"""Prometheus metrics for AgentMesh API."""

from __future__ import annotations

import os
import time
from typing import Callable

# IMPORTANT: clear multiprocess env before importing prometheus_client.
_mp_dir = os.environ.get("PROMETHEUS_MULTIPROC_DIR")
if not _mp_dir or not os.path.isdir(_mp_dir):
    os.environ.pop("PROMETHEUS_MULTIPROC_DIR", None)

from fastapi import FastAPI, Request, Response  # noqa: E402
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest  # noqa: E402
from starlette.middleware.base import BaseHTTPMiddleware  # noqa: E402

HTTP_REQUESTS = Counter(
    "agentmesh_http_requests_total",
    "HTTP request count",
    ["method", "path", "status"],
)
HTTP_LATENCY = Histogram(
    "agentmesh_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
)
EXECUTION_SUBMITTED = Counter(
    "agentmesh_executions_submitted_total",
    "Executions accepted by API",
    ["organization_id"],
)
RATE_LIMITED = Counter(
    "agentmesh_rate_limited_total",
    "Requests rejected by rate limiter",
    ["bucket_type"],
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        path = request.url.path
        compact = "/".join(
            "{id}" if len(part) >= 32 and "-" in part else part for part in path.split("/")
        )
        elapsed = time.perf_counter() - start
        HTTP_REQUESTS.labels(request.method, compact, str(response.status_code)).inc()
        HTTP_LATENCY.labels(request.method, compact).observe(elapsed)
        return response


def mount_metrics(app: FastAPI) -> None:
    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
