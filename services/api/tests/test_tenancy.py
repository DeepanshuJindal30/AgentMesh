"""Tenant isolation tests using FastAPI dependency overrides (no Postgres required)."""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import AuthContext, get_auth_context, require_permission
from app.models import OrgRole


def _make_app() -> FastAPI:
    app = FastAPI()

    @app.get("/agents/{agent_id}")
    async def get_agent(
        agent_id: uuid.UUID,
        ctx: AuthContext = __import__("fastapi").Depends(require_permission("agent:view")),
    ) -> dict[str, Any]:
        # Simulate tenant lookup: only return if org matches hard-coded store
        store = app.state.agent_store  # type: ignore[attr-defined]
        record = store.get(agent_id)
        if record is None or record["organization_id"] != ctx.organization_id:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")
        return record

    @app.post("/agents")
    async def create_agent(
        ctx: AuthContext = __import__("fastapi").Depends(require_permission("agent:create")),
    ) -> dict[str, str]:
        return {"status": "created", "org": str(ctx.organization_id)}

    return app


@pytest.fixture
def orgs() -> dict[str, uuid.UUID]:
    return {"a": uuid.uuid4(), "b": uuid.uuid4()}


@pytest.fixture
def users() -> dict[str, uuid.UUID]:
    return {"a_admin": uuid.uuid4(), "b_admin": uuid.uuid4(), "a_viewer": uuid.uuid4()}


def test_org_a_cannot_read_org_b_agent(orgs: dict[str, uuid.UUID], users: dict[str, uuid.UUID]) -> None:
    app = _make_app()
    agent_b = uuid.uuid4()
    app.state.agent_store = {
        agent_b: {
            "id": str(agent_b),
            "organization_id": orgs["b"],
            "name": "B Agent",
        }
    }

    async def auth_a() -> AuthContext:
        return AuthContext(
            user_id=users["a_admin"],
            email="a@test",
            organization_id=orgs["a"],
            role=OrgRole.ORG_ADMIN,
            correlation_id="t1",
        )

    app.dependency_overrides[get_auth_context] = auth_a
    # require_permission wraps get_auth_context — override the inner dep used by factory
    from app.core import auth as auth_mod

    app.dependency_overrides[auth_mod.get_auth_context] = auth_a

    client = TestClient(app)
    response = client.get(f"/agents/{agent_b}")
    assert response.status_code == 404


def test_guessing_uuid_returns_404(orgs: dict[str, uuid.UUID], users: dict[str, uuid.UUID]) -> None:
    app = _make_app()
    app.state.agent_store = {}

    async def auth_a() -> AuthContext:
        return AuthContext(
            user_id=users["a_admin"],
            email="a@test",
            organization_id=orgs["a"],
            role=OrgRole.ORG_ADMIN,
            correlation_id="t2",
        )

    from app.core import auth as auth_mod

    app.dependency_overrides[auth_mod.get_auth_context] = auth_a
    client = TestClient(app)
    response = client.get(f"/agents/{uuid.uuid4()}")
    assert response.status_code == 404


def test_viewer_cannot_create_agent(orgs: dict[str, uuid.UUID], users: dict[str, uuid.UUID]) -> None:
    app = _make_app()

    async def auth_viewer() -> AuthContext:
        return AuthContext(
            user_id=users["a_viewer"],
            email="viewer@test",
            organization_id=orgs["a"],
            role=OrgRole.VIEWER,
            correlation_id="t3",
        )

    from app.core import auth as auth_mod

    app.dependency_overrides[auth_mod.get_auth_context] = auth_viewer
    client = TestClient(app)
    response = client.post("/agents")
    assert response.status_code == 403
    assert "agent:create" in response.json()["detail"]


def test_admin_org_a_permission_does_not_apply_to_org_b(
    orgs: dict[str, uuid.UUID], users: dict[str, uuid.UUID]
) -> None:
    """Admin of A accessing B's agent with A's org context still gets 404."""
    app = _make_app()
    agent_b = uuid.uuid4()
    app.state.agent_store = {
        agent_b: {"id": str(agent_b), "organization_id": orgs["b"], "name": "secret"}
    }

    async def auth_a_admin() -> AuthContext:
        return AuthContext(
            user_id=users["a_admin"],
            email="admin-a@test",
            organization_id=orgs["a"],  # membership is in A only
            role=OrgRole.ORG_ADMIN,
            correlation_id="t4",
        )

    from app.core import auth as auth_mod

    app.dependency_overrides[auth_mod.get_auth_context] = auth_a_admin
    client = TestClient(app)
    assert client.get(f"/agents/{agent_b}").status_code == 404
