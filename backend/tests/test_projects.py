"""Project CRUD tests."""
from datetime import date, timedelta


def test_create_project(client, admin_headers):
    r = client.post("/projects", json={
        "name": "New Proj", "key": "NP", "status": "on_track",
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=30))}, headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["name"] == "New Proj"
    assert r.json()["key"] == "NP"


def test_list_projects(client, admin_headers, sample_project):
    r = client.get("/projects", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_get_project_detail(client, admin_headers, sample_project):
    r = client.get(f"/projects/{sample_project['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert "tasks" in r.json()


def test_get_missing_project_404(client, admin_headers):
    r = client.get("/projects/99999", headers=admin_headers)
    assert r.status_code == 404


def test_update_project(client, admin_headers, sample_project):
    r = client.patch(f"/projects/{sample_project['id']}",
                     json={"status": "at_risk"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "at_risk"


def test_delete_project(client, admin_headers, sample_project):
    r = client.delete(f"/projects/{sample_project['id']}", headers=admin_headers)
    assert r.status_code == 204
    r2 = client.get(f"/projects/{sample_project['id']}", headers=admin_headers)
    assert r2.status_code == 404


def test_duplicate_project_name_rejected(client, admin_headers, sample_project):
    r = client.post("/projects", json={
        "name": "Test Project", "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=10))}, headers=admin_headers)
    assert r.status_code == 409


def test_project_requires_auth(client):
    r = client.get("/projects")
    assert r.status_code == 401