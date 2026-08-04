"""API v1 router package."""

from fastapi import APIRouter

from app.api.v1 import agents, auth, executions, organizations, security_ops

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(agents.router)
api_router.include_router(executions.router)
api_router.include_router(security_ops.router)
