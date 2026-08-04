"""Database bootstrap: create tables + seed demo tenancy data."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PERMISSIONS, ROLE_PERMISSIONS
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (
    Organization,
    OrganizationMembership,
    OrganizationQuota,
    OrgRole,
    Permission,
    Role,
    RolePermission,
    User,
)

logger = logging.getLogger("agentmesh.api.bootstrap")

# Stable UUIDs so frontend/dev headers can reference demo principals.
DEMO_ORG_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEMO_USERS = {
    "admin@agentmesh.local": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222221"),
        "name": "Ada Admin",
        "role": OrgRole.ORG_ADMIN,
        "sub": "demo-admin",
    },
    "developer@agentmesh.local": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "Dev Builder",
        "role": OrgRole.DEVELOPER,
        "sub": "demo-developer",
    },
    "operator@agentmesh.local": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222223"),
        "name": "Ops Runner",
        "role": OrgRole.OPERATOR,
        "sub": "demo-operator",
    },
    "viewer@agentmesh.local": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222224"),
        "name": "View Only",
        "role": OrgRole.VIEWER,
        "sub": "demo-viewer",
    },
}


async def create_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database schema ensured")


async def seed_reference_data(session: AsyncSession) -> None:
    # Roles
    role_rows: dict[OrgRole, Role] = {}
    for org_role in OrgRole:
        result = await session.execute(select(Role).where(Role.name == org_role.value))
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(name=org_role.value, description=org_role.value.replace("_", " ").title())
            session.add(role)
            await session.flush()
        role_rows[org_role] = role

    # Permissions + role_permissions
    perm_rows: dict[str, Permission] = {}
    for code, description in PERMISSIONS.items():
        result = await session.execute(select(Permission).where(Permission.code == code))
        perm = result.scalar_one_or_none()
        if perm is None:
            perm = Permission(code=code, description=description)
            session.add(perm)
            await session.flush()
        perm_rows[code] = perm

    for org_role, codes in ROLE_PERMISSIONS.items():
        role = role_rows[org_role]
        for code in codes:
            perm = perm_rows[code]
            result = await session.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id,
                )
            )
            if result.scalar_one_or_none() is None:
                session.add(RolePermission(role_id=role.id, permission_id=perm.id))

    # Demo organization
    result = await session.execute(select(Organization).where(Organization.id == DEMO_ORG_ID))
    org = result.scalar_one_or_none()
    if org is None:
        org = Organization(id=DEMO_ORG_ID, name="Acme Robotics", slug="acme")
        session.add(org)
        await session.flush()
        session.add(
            OrganizationQuota(
                organization_id=org.id,
                max_concurrent_executions=10,
                monthly_execution_quota=1000,
                monthly_token_quota=1_000_000,
                requests_per_minute=120,
            )
        )

    for email, meta in DEMO_USERS.items():
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=meta["id"],
                email=email,
                display_name=meta["name"],
                keycloak_sub=meta["sub"],
                is_active=True,
            )
            session.add(user)
            await session.flush()

        result = await session.execute(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.user_id == user.id,
            )
        )
        if result.scalar_one_or_none() is None:
            session.add(
                OrganizationMembership(
                    organization_id=org.id,
                    user_id=user.id,
                    role_id=role_rows[meta["role"]].id,
                )
            )

    await session.commit()
    logger.info("demo tenancy seed complete org=%s", org.slug)


async def bootstrap_database() -> None:
    await create_schema()
    async with SessionLocal() as session:
        await seed_reference_data(session)
