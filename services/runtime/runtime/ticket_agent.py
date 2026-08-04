"""Ticket similarity agent steps executed inside the runtime."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterator

from runtime.providers import cosine, get_embedding_provider, get_llm_provider


@dataclass
class StepEvent:
    sequence_number: int
    event_type: str
    message: str
    payload: dict[str, Any]
    prompt_tokens: int = 0
    completion_tokens: int = 0
    is_terminal: bool = False
    error_code: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "sequence_number": self.sequence_number,
            "event_type": self.event_type,
            "message": self.message,
            "payload_json": json.dumps(self.payload),
            "token_usage": {
                "prompt_tokens": self.prompt_tokens,
                "completion_tokens": self.completion_tokens,
                "total_tokens": self.prompt_tokens + self.completion_tokens,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_terminal": self.is_terminal,
            "error_code": self.error_code,
        }


# Synthetic knowledge base shared by mock runtime (no proprietary data).
SEED_TICKETS: list[dict[str, Any]] = [
    {
        "id": "T-1001",
        "title": "Checkout API timeouts after canary deploy",
        "description": "Payments gateway returns 504 under peak traffic after deploy of checkout-service",
        "root_cause": "Connection pool exhausted due to lowered idle timeout",
        "resolution": "Raised pool size and restored idle timeout; added circuit breaker",
        "developer": "alex.dev",
        "tester": "sam.qa",
        "repository": "services/checkout-service",
        "tags": ["payments", "timeout", "deploy"],
    },
    {
        "id": "T-1002",
        "title": "Login redirects loop for SSO users",
        "description": "OIDC callback intermittently fails with state mismatch",
        "root_cause": "Clock skew between app pods and IdP",
        "resolution": "Synced NTP and widened state TTL",
        "developer": "jordan.dev",
        "tester": "casey.qa",
        "repository": "apps/web-auth",
        "tags": ["auth", "oidc", "sso"],
    },
    {
        "id": "T-1003",
        "title": "Search latency spike on catalog",
        "description": "Product search p95 jumped to 2s after index rebuild",
        "root_cause": "Missing composite index on category+updated_at",
        "resolution": "Added index and warmed cache",
        "developer": "riley.dev",
        "tester": "morgan.qa",
        "repository": "services/catalog-api",
        "tags": ["search", "performance", "postgres"],
    },
    {
        "id": "T-1004",
        "title": "Worker crash on large CSV import",
        "description": "Import job OOMs when file > 200MB",
        "root_cause": "Loaded entire file into memory",
        "resolution": "Switched to streaming parser and chunked writes",
        "developer": "taylor.dev",
        "tester": "jamie.qa",
        "repository": "services/import-worker",
        "tags": ["memory", "worker", "import"],
    },
    {
        "id": "T-1005",
        "title": "Payment webhook duplicates create double charges",
        "description": "Retry from provider caused duplicate order fulfillment",
        "root_cause": "Missing idempotency key on webhook handler",
        "resolution": "Added idempotency store and unique constraint",
        "developer": "alex.dev",
        "tester": "sam.qa",
        "repository": "services/checkout-service",
        "tags": ["payments", "idempotency", "webhook"],
    },
]


def run_ticket_similarity(user_input: dict[str, Any], config: dict[str, Any]) -> Iterator[StepEvent]:
    seq = 0
    top_k = int(config.get("top_k", 5))
    force_fail = bool(user_input.get("force_fail"))

    seq += 1
    yield StepEvent(seq, "STARTED", "Execution started", {"agent": "ticket_similarity"})

    if force_fail:
        seq += 1
        yield StepEvent(
            seq,
            "FAILED",
            "Controlled failure requested by input.force_fail",
            {"force_fail": True},
            is_terminal=True,
            error_code="CONTROLLED_FAILURE",
        )
        return

    emb = get_embedding_provider()
    llm = get_llm_provider()

    query_text = f"{user_input.get('title', '')}\n{user_input.get('description', '')}"
    seq += 1
    yield StepEvent(seq, "STEP", "Generating query embedding", {"provider": "mock"})

    query_vec = emb.embed(query_text)
    scored: list[tuple[float, dict[str, Any]]] = []
    for ticket in SEED_TICKETS:
        ticket_text = f"{ticket['title']}\n{ticket['description']}\n{ticket['root_cause']}"
        score = cosine(query_vec, emb.embed(ticket_text))
        scored.append((score, ticket))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    similar = [
        {
            "ticket_id": t["id"],
            "title": t["title"],
            "similarity": round(score, 4),
            "root_cause": t["root_cause"],
            "resolution": t["resolution"],
            "developer": t["developer"],
            "repository": t["repository"],
            "tags": t["tags"],
        }
        for score, t in top
    ]

    seq += 1
    yield StepEvent(
        seq,
        "STEP",
        f"Found {len(similar)} similar tickets",
        {"similar_incidents": similar},
        prompt_tokens=120,
        completion_tokens=0,
    )

    best = similar[0] if similar else None
    prompt = f"Incident: {query_text}\nBest match: {json.dumps(best)}"
    advice = llm.complete(prompt)

    result = {
        "similar_incidents": similar,
        "likely_root_cause": best["root_cause"] if best else "Unknown",
        "suggested_investigation_steps": [
            "Compare recent deploys in the cited repository",
            "Inspect error rates and latency around the incident window",
            "Validate timeout/pool settings against the prior resolution",
            "Confirm ownership with the previous developer/tester",
        ],
        "relevant_repository": best["repository"] if best else "",
        "previous_owner": best["developer"] if best else "",
        "evidence_citations": [s["ticket_id"] for s in similar],
        "analysis": advice,
    }

    seq += 1
    yield StepEvent(
        seq,
        "STEP",
        "Generated investigation guidance",
        {"analysis_preview": advice[:160]},
        prompt_tokens=80,
        completion_tokens=60,
    )

    seq += 1
    yield StepEvent(
        seq,
        "SUCCEEDED",
        "Ticket similarity analysis complete",
        result,
        prompt_tokens=200,
        completion_tokens=60,
        is_terminal=True,
    )
