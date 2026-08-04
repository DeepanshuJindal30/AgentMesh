"""Unit tests for RBAC permission matrix."""

from app.core.permissions import role_has_permission
from app.models import OrgRole


def test_viewer_cannot_create_agent() -> None:
    assert not role_has_permission(OrgRole.VIEWER, "agent:create")
    assert not role_has_permission(OrgRole.VIEWER, "execution:run")


def test_viewer_can_view() -> None:
    assert role_has_permission(OrgRole.VIEWER, "agent:view")
    assert role_has_permission(OrgRole.VIEWER, "execution:view")


def test_developer_can_create_and_run() -> None:
    assert role_has_permission(OrgRole.DEVELOPER, "agent:create")
    assert role_has_permission(OrgRole.DEVELOPER, "execution:run")
    assert not role_has_permission(OrgRole.DEVELOPER, "member:manage")


def test_operator_can_cancel_not_publish() -> None:
    assert role_has_permission(OrgRole.OPERATOR, "execution:cancel")
    assert not role_has_permission(OrgRole.OPERATOR, "agent:publish")


def test_admin_has_all_key_permissions() -> None:
    for perm in (
        "org:manage",
        "member:manage",
        "agent:create",
        "agent:publish",
        "execution:run",
        "apikey:manage",
    ):
        assert role_has_permission(OrgRole.ORG_ADMIN, perm)


def test_admin_in_one_org_does_not_imply_global_admin() -> None:
    """Roles are org-scoped; permission helper is role-based only.
    Cross-org isolation is enforced by membership lookup (see tenancy tests)."""
    assert role_has_permission(OrgRole.ORG_ADMIN, "member:manage")
    assert not role_has_permission(OrgRole.VIEWER, "member:manage")
