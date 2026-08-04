"""Unit tests for ticket similarity agent (no Docker required)."""

from runtime.ticket_agent import run_ticket_similarity


def test_ticket_similarity_succeeds() -> None:
    events = list(
        run_ticket_similarity(
            {"title": "Checkout timeout after deploy", "description": "504 payments"},
            {"type": "ticket_similarity", "top_k": 3},
        )
    )
    assert events[0].event_type == "STARTED"
    assert events[-1].event_type == "SUCCEEDED"
    assert events[-1].is_terminal
    assert "similar_incidents" in events[-1].payload


def test_controlled_failure() -> None:
    events = list(run_ticket_similarity({"force_fail": True}, {}))
    assert events[-1].event_type == "FAILED"
    assert events[-1].error_code == "CONTROLLED_FAILURE"
