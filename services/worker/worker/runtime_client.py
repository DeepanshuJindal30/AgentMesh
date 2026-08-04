"""gRPC client for AgentRuntimeService (JSON-framed)."""

from __future__ import annotations

import json
import os
from typing import Any, Iterator

import grpc

SERVICE = "agentmesh.runtime.v1.AgentRuntimeService"


def _channel() -> grpc.Channel:
    host = os.getenv("RUNTIME_GRPC_HOST", "localhost")
    port = os.getenv("RUNTIME_GRPC_PORT", "50051")
    return grpc.insecure_channel(f"{host}:{port}")


def run_execution_stream(request: dict[str, Any]) -> Iterator[dict[str, Any]]:
    method = f"/{SERVICE}/RunExecution"
    with _channel() as channel:
        call = channel.unary_stream(
            method,
            request_serializer=lambda d: json.dumps(d).encode("utf-8"),
            response_deserializer=lambda b: json.loads(b.decode("utf-8")),
        )
        yield from call(request, timeout=int(request.get("timeout_seconds") or 120))
