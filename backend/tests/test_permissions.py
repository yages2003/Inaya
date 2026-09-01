"""Permission matrix logic tests (pure functions)."""
from permissions import Role, Perm, has_perm, permissions_for


def test_super_admin_has_all():
    assert all(has_perm(Role.super_admin, p) for p in Perm)


def test_viewer_is_read_only():
    assert has_perm(Role.viewer, Perm.project_view)
    assert has_perm(Role.viewer, Perm.task_view)
    assert not has_perm(Role.viewer, Perm.project_create)
    assert not has_perm(Role.viewer, Perm.task_edit_any)


def test_developer_edits_own_not_any():
    assert has_perm(Role.developer, Perm.task_edit_own)
    assert not has_perm(Role.developer, Perm.task_edit_any)


def test_pm_can_manage_projects_not_users():
    assert has_perm(Role.project_manager, Perm.project_create)
    assert not has_perm(Role.project_manager, Perm.manage_users)


def test_permissions_for_returns_sorted_list():
    perms = permissions_for(Role.viewer)
    assert isinstance(perms, list)
    assert perms == sorted(perms)


def test_all_roles_can_view_projects():
    for role in Role:
        assert has_perm(role, Perm.project_view)