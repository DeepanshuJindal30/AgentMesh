"""API unit tests — health endpoints (Phase 1)."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "api"


def test_system_info() -> None:
    client = TestClient(create_app())
    response = client.get("/api/v1/system/info")
    assert response.status_code == 200
    assert response.json()["phase"] == "production-readiness"


def test_ready_without_deps_is_ok() -> None:
    """When dependency URLs are unset, checks are skipped and ready succeeds."""
    client = TestClient(create_app())
    response = client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["postgres"] == "skipped"
