"""Redis rate limiting with atomic sliding-window counter (Lua)."""

from __future__ import annotations

import time
from dataclasses import dataclass

from app.services.events import get_redis

# Atomic: INCR + EXPIRE only when key is created.
_RATE_LIMIT_LUA = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, window)
end
local ttl = redis.call('TTL', key)
if current > limit then
  return {0, ttl > 0 and ttl or window}
end
return {1, ttl > 0 and ttl or window}
"""


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after: int
    remaining: int


def check_rate_limit(bucket: str, limit: int, window_seconds: int = 60) -> RateLimitResult:
    """
    Distributed per-bucket RPM limiter.
    bucket examples: user:{id}, apikey:{prefix}, org:{id}
    """
    client = get_redis()
    key = f"ratelimit:{bucket}:{int(time.time() // window_seconds)}"
    allowed, ttl = client.eval(_RATE_LIMIT_LUA, 1, key, limit, window_seconds)
    current = int(client.get(key) or 0)
    remaining = max(0, limit - current)
    return RateLimitResult(allowed=bool(allowed), retry_after=int(ttl), remaining=remaining)
