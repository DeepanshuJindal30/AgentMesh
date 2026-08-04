"""Organization and membership routes."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import AuthContext, require_permission
from app.db.session import get_db
from app.models import Organization, OrganizationMembership, OrgRole, Role, User
from app.schemas import (
    MemberInvite,
    MemberOut,
    MemberRoleUpdate,
    OrganizationCreate,
    OrganizationOut,
)

router = APIRouter(prefix="/api/v1", tags=["organizations"])


@router.get("/organizations", response_model=list[OrganizationOut])
async def list_organizations(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:view"))],
) -> list[Organization]:
    result = await db.execute(
        select(Organization)
        .join(OrganizationMembership)
        .where(OrganizationMembership.user_id == ctx.user_id)
        .order_by(Organization.name)
    )
    return list(result.scalars().unique().all())


@router.post("/organizations", response_model=OrganizationOut, status_code=201)
async def create_organization(
    body: OrganizationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("org:manage"))],
) -> Organization:
    existing = await db.execute(select(Organization).where(Organization.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already exists")
    org = Organization(name=body.name, slug=body.slug)
    db.add(org)
    await db.flush()
    role = (
        await db.execute(select(Role).where(Role.name == OrgRole.ORG_ADMIN.value))
    ).scalar_one()
    db.add(
        OrganizationMembership(
            organization_id=org.id,
            user_id=ctx.user_id,
            role_id=role.id,
        )
    )
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/members", response_model=list[MemberOut])
async def list_members(
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("agent:view"))],
) -> list[MemberOut]:
    result = await db.execute(
        select(OrganizationMembership)
        .options(
            selectinload(OrganizationMembership.user),
            selectinload(OrganizationMembership.role),
        )
        .where(OrganizationMembership.organization_id == ctx.organization_id)
        .order_by(OrganizationMembership.created_at)
    )
    rows = result.scalars().all()
    return [
        MemberOut(
            id=m.id,
            user_id=m.user_id,
            email=m.user.email,
            display_name=m.user.display_name,
            role=m.role.name,
            organization_id=m.organization_id,
        )
        for m in rows
    ]


@router.post("/members", response_model=MemberOut, status_code=201)
async def invite_member(
    body: MemberInvite,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("member:manage"))],
) -> MemberOut:
    role = (
        await db.execute(select(Role).where(Role.name == body.role))
    ).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=400, detail="Unknown role")

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            email=str(body.email),
            display_name=body.display_name,
            keycloak_sub=f"pending:{body.email}",
            is_active=True,
        )
        db.add(user)
        await db.flush()

    existing = await db.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == ctx.organization_id,
            OrganizationMembership.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a member")

    membership = OrganizationMembership(
        organization_id=ctx.organization_id,
        user_id=user.id,
        role_id=role.id,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return MemberOut(
        id=membership.id,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=role.name,
        organization_id=ctx.organization_id,
    )


@router.patch("/members/{membership_id}", response_model=MemberOut)
async def update_member_role(
    membership_id: uuid.UUID,
    body: MemberRoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    ctx: Annotated[AuthContext, Depends(require_permission("member:manage"))],
) -> MemberOut:
    result = await db.execute(
        select(OrganizationMembership)
        .options(
            selectinload(OrganizationMembership.user),
            selectinload(OrganizationMembership.role),
        )
        .where(
            OrganizationMembership.id == membership_id,
            OrganizationMembership.organization_id == ctx.organization_id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="Not found")

    role = (
        await db.execute(select(Role).where(Role.name == body.role))
    ).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=400, detail="Unknown role")

    membership.role_id = role.id
    await db.commit()
    await db.refresh(membership)
    return MemberOut(
        id=membership.id,
        user_id=membership.user_id,
        email=membership.user.email,
        display_name=membership.user.display_name,
        role=role.name,
        organization_id=membership.organization_id,
    )
