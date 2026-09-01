"""
Inaya — Roles and permission matrix (single source of truth for RBAC).

Uses a single GLOBAL role per user (8 Jira-style roles). Per-project role
matrices are a documented future extension.
"""

import enum


class Role(str, enum.Enum):
    super_admin = "super_admin"
    org_admin = "org_admin"
    project_manager = "project_manager"
    scrum_master = "scrum_master"
    developer = "developer"
    qa_engineer = "qa_engineer"
    reporter = "reporter"
    viewer = "viewer"


ROLE_LABELS = {
    Role.super_admin: "Super Admin",
    Role.org_admin: "Organization Admin",
    Role.project_manager: "Project Manager",
    Role.scrum_master: "Scrum Master",
    Role.developer: "Developer",
    Role.qa_engineer: "QA Engineer",
    Role.reporter: "Reporter",
    Role.viewer: "Viewer",
}


class Perm(str, enum.Enum):
    manage_users = "manage_users"
    invite_users = "invite_users"
    project_create = "project_create"
    project_edit = "project_edit"
    project_delete = "project_delete"
    project_view = "project_view"
    task_create = "task_create"
    task_edit_any = "task_edit_any"
    task_edit_own = "task_edit_own"
    task_delete = "task_delete"
    task_view = "task_view"
    comment_create = "comment_create"
    activity_view = "activity_view"


ROLE_PERMISSIONS = {
    Role.super_admin: {p for p in Perm},
    Role.org_admin: {
        Perm.invite_users, Perm.manage_users,
        Perm.project_create, Perm.project_edit, Perm.project_delete, Perm.project_view,
        Perm.task_create, Perm.task_edit_any, Perm.task_delete, Perm.task_view,
        Perm.comment_create, Perm.activity_view,
    },
    Role.project_manager: {
        Perm.project_create, Perm.project_edit, Perm.project_view,
        Perm.task_create, Perm.task_edit_any, Perm.task_delete, Perm.task_view,
        Perm.comment_create, Perm.activity_view,
    },
    Role.scrum_master: {
        Perm.project_view,
        Perm.task_create, Perm.task_edit_any, Perm.task_view,
        Perm.comment_create, Perm.activity_view,
    },
    Role.developer: {
        Perm.project_view, Perm.task_view, Perm.task_edit_own,
        Perm.comment_create, Perm.activity_view,
    },
    Role.qa_engineer: {
        Perm.project_view, Perm.task_view, Perm.task_edit_own, Perm.task_create,
        Perm.comment_create, Perm.activity_view,
    },
    Role.reporter: {
        Perm.project_view, Perm.task_view, Perm.task_create,
        Perm.comment_create, Perm.activity_view,
    },
    Role.viewer: {
        Perm.project_view, Perm.task_view, Perm.activity_view,
    },
}


def has_perm(role: Role, perm: Perm) -> bool:
    return perm in ROLE_PERMISSIONS.get(role, set())


def permissions_for(role: Role) -> list[str]:
    return sorted(p.value for p in ROLE_PERMISSIONS.get(role, set()))