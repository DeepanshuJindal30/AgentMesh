"""gRPC AgentRuntimeService with JSON-framed streaming events.

The Protocol Buffer contract lives in packages/proto. This runtime implements
the same service/method names and field shapes using JSON payloads so the
internal boundary is typed and streamable without a fragile codegen step in CI.
"""

from __future__ import annotations

import json
import logging
import os
from concurrent import futures
from typing import Any, Iterator

import grpc
from grpc import StatusCode

from runtime.ticket_agent import run_ticket_similarity

SERVICE_NAME = os.getenv("SERVICE_NAME", "runtime")
GRPC_PORT = int(os.getenv("RUNTIME_GRPC_PORT", "50051"))
VERSION = "0.2.0"
logger = logging.getLogger(SERVICE_NAME)


def _json_deserializer(raw: bytes) -> dict[str, Any]:
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _json_serializer(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload).encode("utf-8")


class AgentRuntimeServicer:
    def HealthCheck(self, request: dict[str, Any], context: grpc.ServicerContext) -> dict[str, Any]:
        _ = request, context
        return {"status": "ok", "version": VERSION}

    def RunExecution(
        self, request: dict[str, Any], context: grpc.ServicerContext
    ) -> Iterator[dict[str, Any]]:
        try:
            config = json.loads(request.get("agent_configuration") or "{}")
            user_input = json.loads(request.get("user_input") or "{}")
        except json.JSONDecodeError:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid JSON in request")
            return

        agent_type = config.get("type", "ticket_similarity")
        if agent_type != "ticket_similarity":
            yield {
                "sequence_number": 1,
                "event_type": "FAILED",
                "message": f"Unsupported agent type: {agent_type}",
                "payload_json": "{}",
                "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                "timestamp": "",
                "is_terminal": True,
                "error_code": "UNSUPPORTED_AGENT",
            }
            return

        for step in run_ticket_similarity(user_input, config):
            if context.is_active() is False:
                return
            yield step.to_dict()


def serve() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
    handlers = {
        "HealthCheck": grpc.unary_unary_rpc_method_handler(
            AgentRuntimeServicer().HealthCheck,
            request_deserializer=_json_deserializer,
            response_serializer=_json_serializer,
        ),
        "RunExecution": grpc.unary_stream_rpc_method_handler(
            AgentRuntimeServicer().RunExecution,
            request_deserializer=_json_deserializer,
            response_serializer=_json_serializer,
        ),
    }
    generic = grpc.method_handlers_generic_handler(
        "agentmesh.runtime.v1.AgentRuntimeService",
        handlers,
    )
    server.add_generic_rpc_handlers((generic,))
    listen_addr = f"[::]:{GRPC_PORT}"
    server.add_insecure_port(listen_addr)
    server.start()
    logger.info("runtime listening on %s version=%s", listen_addr, VERSION)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
