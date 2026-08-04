"""Redis Pub/Sub publisher for live execution events."""

from __future__ import annotations

import json
import os
from typing import Any

import redis

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    return _redis


def execution_channel(execution_id: str) -> str:
    return f"execution:{execution_id}:events"


def publish_execution_event(execution_id: str, event: dict[str, Any]) -> None:
    get_redis().publish(execution_channel(execution_id), json.dumps(event, default=str))
