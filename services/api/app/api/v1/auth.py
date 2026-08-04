"""Auth routes — Keycloak password grant + local demo session."""

from __future__ import annotations

import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import AuthContext, get_auth_context
from app.core.config import Settings, get_settings
from app.core.permissions import ROLE_PERMISSIONS
from app.db.session import get_db
from app.models import Organization, OrganizationMembership, User
from app.schemas import AuthSessionOut, DevLoginRequest, MeOut

logger = logging.getLogger("agentmesh.api.auth")
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=AuthSessionOut)
async def login(
    body: DevLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionOut:
    """
    Local demo login via Keycloak Resource Owner Password grant.
    Browser should store the token only via HttpOnly BFF cookie (Next.js),
    never in localStorage.
    """
    token_url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        "/protocol/openid-connect/token"
    )
    data = {
        "grant_type": "password",
        "client_id": settings.keycloak_client_id,
        "username": body.email,
        "password": body.password,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(token_url, data=data)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Identity provider unavailable: {exc}",
        ) from exc

    if resp.status_code >= 400:
        # Fallback for offline/dev when Keycloak password grant is unavailable
        if settings.auth_dev_bypass and body.password == "AgentMesh!Dev1":
            return await _dev_session(db, body.email, body.organization_slug)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = resp.json()
    access_token = payload["access_token"]
    claims = jwt.get_unverified_claims(access_token)
    email = claims.get("email") or claims.get("preferred_username") or body.email
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        # Link by keycloak_sub if seeded with placeholder sub
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not provisioned in AgentMesh")

    # Prefer updating keycloak_sub to real IdP subject
    if user.keycloak_sub != sub:
        user.keycloak_sub = sub
        await db.commit()

    org_result = await db.execute(
        select(Organization).where(Organization.slug == body.organization_slug)
    )
    org = org_result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    membership = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.role))
        .where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.organization_id == org.id,
        )
    )
    mem = membership.scalar_one_or_none()
    if mem is None:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return AuthSessionOut(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        organization_id=org.id,
        organization_name=org.name,
        role=mem.role.name,
    )


async def _dev_session(db: AsyncSession, email: str, org_slug: str) -> AuthSessionOut:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown demo user")
    org_result = await db.execute(select(Organization).where(Organization.slug == org_slug))
    org = org_result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    membership = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.role))
        .where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.organization_id == org.id,
        )
    )
    mem = membership.scalar_one_or_none()
    if mem is None:
        raise HTTPException(status_code=403, detail="Not a member")

    # Unsigned demo token consumed only when AUTH_DEV_BYPASS is enabled
    token = jwt.encode(
        {"sub": user.keycloak_sub, "email": user.email, "preferred_username": user.email},
        key="dev-only",
        algorithm="HS256",
    )
    return AuthSessionOut(
        access_token=token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        organization_id=org.id,
        organization_name=org.name,
        role=mem.role.name,
    )


@router.get("/me", response_model=MeOut)
async def me(ctx: Annotated[AuthContext, Depends(get_auth_context)]) -> MeOut:
    perms = sorted(ROLE_PERMISSIONS.get(ctx.role, frozenset()))
    return MeOut(
        user_id=ctx.user_id,
        email=ctx.email,
        organization_id=ctx.organization_id,
        role=ctx.role.value,
        permissions=perms,
    )
