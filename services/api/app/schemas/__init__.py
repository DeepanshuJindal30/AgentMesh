"""Pydantic schemas for API v1."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class OrganizationOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")


class MemberOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    display_name: str
    role: str
    organization_id: uuid.UUID


class MemberInvite(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    display_name: str = Field(min_length=1, max_length=200)
    role: str = Field(pattern=r"^(org_admin|developer|operator|viewer)$")


class MemberRoleUpdate(BaseModel):
    role: str = Field(pattern=r"^(org_admin|developer|operator|viewer)$")


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    configuration: dict[str, Any] = Field(default_factory=dict)


class AgentOut(ORMModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: str
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AgentVersionOut(ORMModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    organization_id: uuid.UUID
    version_number: int
    status: str
    configuration: dict[str, Any]
    published_at: Optional[datetime]
    created_at: datetime


class AgentVersionCreate(BaseModel):
    configuration: dict[str, Any] = Field(default_factory=dict)


class ExecutionCreate(BaseModel):
    agent_id: uuid.UUID
    agent_version_id: Optional[uuid.UUID] = None
    input_payload: dict[str, Any] = Field(default_factory=dict)


class ExecutionOut(ORMModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: uuid.UUID
    agent_version_id: uuid.UUID
    status: str
    input_payload: dict[str, Any]
    output_payload: Optional[dict[str, Any]]
    error_details: Optional[dict[str, Any]]
    retry_count: int
    correlation_id: str
    queued_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    token_usage_total: int
    estimated_cost_usd: str
    worker_id: Optional[str] = None


class DevLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1)
    organization_slug: str = "acme"


class AuthSessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    email: str
    display_name: str
    organization_id: uuid.UUID
    organization_name: str
    role: str


class MeOut(BaseModel):
    user_id: uuid.UUID
    email: str
    organization_id: uuid.UUID
    role: str
    permissions: list[str]


class ErrorOut(BaseModel):
    detail: str
    correlation_id: Optional[str] = None
