"""Authentication context and FastAPI dependencies."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings, get_settings
from app.core.permissions import role_has_permission
from app.db.session import get_db
from app.models import OrganizationMembership, OrgRole, User


@dataclass(frozen=True)
class AuthContext:
    user_id: uuid.UUID
    email: str
    organization_id: uuid.UUID
    role: OrgRole
    correlation_id: str

    def has_permission(self, permission: str) -> bool:
        return role_has_permission(self.role, permission)


async def _load_membership(
    db: AsyncSession, user_id: uuid.UUID, organization_id: uuid.UUID
) -> OrganizationMembership:
    result = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.role))
        .where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.organization_id == organization_id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return membership


def _role_from_name(name: str) -> OrgRole:
    try:
        return OrgRole(name)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role: {name}",
        ) from exc


async def get_auth_context(
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[Optional[str], Header()] = None,
    x_organization_id: Annotated[Optional[str], Header()] = None,
    x_correlation_id: Annotated[Optional[str], Header()] = None,
    x_dev_user: Annotated[Optional[str], Header()] = None,
    x_dev_org: Annotated[Optional[str], Header()] = None,
    x_dev_role: Annotated[Optional[str], Header()] = None,
) -> AuthContext:
    """
    Resolve the caller.

    Production path: Bearer JWT from Keycloak + verified membership.
    Local free path: AUTH_DEV_BYPASS + X-Dev-* headers (tests / offline).

    organization_id is NEVER trusted from the request body — only from
    verified membership for the authenticated user (header selects which
    membership when the user belongs to multiple orgs).
    """
    correlation_id = x_correlation_id or str(uuid.uuid4())

    # --- Dev bypass headers (unit tests) ---
    if settings.auth_dev_bypass and x_dev_user and x_dev_org:
        try:
            user_id = uuid.UUID(x_dev_user)
            org_id = uuid.UUID(x_dev_org)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid dev auth headers") from exc
        role = _role_from_name(x_dev_role or OrgRole.VIEWER.value)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is not None:
            membership = await _load_membership(db, user_id, org_id)
            role = _role_from_name(membership.role.name)
            return AuthContext(
                user_id=user.id,
                email=user.email,
                organization_id=org_id,
                role=role,
                correlation_id=correlation_id,
            )
        return AuthContext(
            user_id=user_id,
            email=f"{user_id}@dev.local",
            organization_id=org_id,
            role=role,
            correlation_id=correlation_id,
        )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.split(" ", 1)[1]
    try:
        if settings.auth_dev_bypass:
            claims = jwt.get_unverified_claims(token)
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="JWT JWKS verification requires Keycloak (set AUTH_DEV_BYPASS=true for local)",
            )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    sub = claims.get("sub")
    email = claims.get("email") or claims.get("preferred_username")
    if not sub and not email:
        raise HTTPException(status_code=401, detail="Token missing subject/email")

    user = None
    if sub:
        result = await db.execute(select(User).where(User.keycloak_sub == sub))
        user = result.scalar_one_or_none()
    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not provisioned")

    if not x_organization_id:
        raise HTTPException(status_code=400, detail="X-Organization-Id header required")
    try:
        org_id = uuid.UUID(x_organization_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-Organization-Id") from exc

    membership = await _load_membership(db, user.id, org_id)
    return AuthContext(
        user_id=user.id,
        email=user.email,
        organization_id=org_id,
        role=_role_from_name(membership.role.name),
        correlation_id=correlation_id,
    )


def require_permission(permission: str):
    """Reusable FastAPI dependency factory: require_permission('agent:create')."""

    async def _dependency(
        ctx: Annotated[AuthContext, Depends(get_auth_context)],
    ) -> AuthContext:
        if not ctx.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return ctx

    return _dependency
