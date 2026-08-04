"""RBAC permission catalog and role mappings."""

from __future__ import annotations

from app.models import OrgRole

# Permission codes used by require_permission("...")
PERMISSIONS: dict[str, str] = {
    "org:manage": "Manage organization settings",
    "member:manage": "Invite members and change roles",
    "agent:create": "Create agents",
    "agent:publish": "Publish agent versions",
    "agent:view": "View agents",
    "execution:run": "Submit executions",
    "execution:cancel": "Cancel executions",
    "execution:retry": "Retry failed executions",
    "execution:view": "View executions and logs",
    "apikey:manage": "Manage API keys",
    "audit:view": "View audit logs",
    "usage:view": "View usage and quotas",
    "ticket:manage": "Manage ticket knowledge base",
    "ticket:view": "View tickets",
}

ROLE_PERMISSIONS: dict[OrgRole, frozenset[str]] = {
    OrgRole.ORG_ADMIN: frozenset(PERMISSIONS.keys()),
    OrgRole.DEVELOPER: frozenset(
        {
            "agent:create",
            "agent:publish",
            "agent:view",
            "execution:run",
            "execution:retry",
            "execution:view",
            "ticket:manage",
            "ticket:view",
            "usage:view",
        }
    ),
    OrgRole.OPERATOR: frozenset(
        {
            "agent:view",
            "execution:run",
            "execution:cancel",
            "execution:retry",
            "execution:view",
            "ticket:view",
            "usage:view",
        }
    ),
    OrgRole.VIEWER: frozenset(
        {
            "agent:view",
            "execution:view",
            "ticket:view",
            "usage:view",
        }
    ),
}


def role_has_permission(role: OrgRole | str, permission: str) -> bool:
    if isinstance(role, str):
        role = OrgRole(role)
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
