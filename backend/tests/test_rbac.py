"""Role-based access control tests — the bonus feature."""
from datetime import date, timedelta


def test_admin_can_list_users(client, admin_headers):
    r = client.get("/auth/users", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_viewer_cannot_list_users(client, make_user):
    vh = make_user("viewer@test.com", "viewer")
    r = client.get("/auth/users", headers=vh)
    assert r.status_code == 403


def test_viewer_cannot_create_project(client, make_user):
    vh = make_user("viewer2@test.com", "viewer")
    r = client.post("/projects", json={
        "name": "X", "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=10))}, headers=vh)
    assert r.status_code == 403


def test_pm_can_create_project(client, make_user):
    ph = make_user("pm@test.com", "project_manager")
    r = client.post("/projects", json={
        "name": "PM Project", "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=10))}, headers=ph)
    assert r.status_code == 201


def test_admin_can_change_role(client, admin_headers, make_user):
    make_user("target@test.com", "viewer")
    users = client.get("/auth/users", headers=admin_headers).json()
    uid = next(u["id"] for u in users if u["email"] == "target@test.com")
    r = client.patch(f"/auth/users/{uid}/role", json={"role": "developer"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "developer"


def test_cannot_demote_last_super_admin(client, admin_headers):
    users = client.get("/auth/users", headers=admin_headers).json()
    uid = next(u["id"] for u in users if u["role"] == "super_admin")
    r = client.patch(f"/auth/users/{uid}/role", json={"role": "viewer"}, headers=admin_headers)
    assert r.status_code == 400


def test_cannot_deactivate_self(client, admin_headers):
    users = client.get("/auth/users", headers=admin_headers).json()
    uid = users[0]["id"]
    r = client.patch(f"/auth/users/{uid}/active?active=false", headers=admin_headers)
    assert r.status_code == 400


def test_developer_edits_own_task_only(client, admin_headers, make_user, sample_project):
    dev_h = make_user("dev@test.com", "developer")
    # admin creates an assignee matching the dev's email + a task assigned to them
    a = client.post("/assignees", json={"name": "Dev", "email": "dev@test.com"}, headers=admin_headers).json()
    t_own = client.post("/tasks", json={
        "title": "Dev task", "project_id": sample_project["id"], "assignee_ids": [a["id"]]},
        headers=admin_headers).json()
    t_other = client.post("/tasks", json={
        "title": "Other task", "project_id": sample_project["id"], "assignee_ids": []},
        headers=admin_headers).json()
    # dev can edit own
    r1 = client.patch(f"/tasks/{t_own['id']}", json={"status": "in_progress"}, headers=dev_h)
    assert r1.status_code == 200
    # dev cannot edit other
    r2 = client.patch(f"/tasks/{t_other['id']}", json={"status": "in_progress"}, headers=dev_h)
    assert r2.status_code == 403