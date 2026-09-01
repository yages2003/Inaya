"""Task CRUD, comments, and My Tasks tests."""
from datetime import date, timedelta


def test_create_task(client, admin_headers, sample_project):
    r = client.post("/tasks", json={
        "title": "A task", "project_id": sample_project["id"],
        "category": "development", "priority": "high", "assignee_ids": []},
        headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["title"] == "A task"
    assert r.json()["priority"] == "high"


def test_task_on_missing_project_404(client, admin_headers):
    r = client.post("/tasks", json={
        "title": "X", "project_id": 99999, "assignee_ids": []}, headers=admin_headers)
    assert r.status_code == 404


def test_list_tasks_by_project(client, admin_headers, sample_project):
    client.post("/tasks", json={"title": "T1", "project_id": sample_project["id"], "assignee_ids": []},
                headers=admin_headers)
    r = client.get(f"/tasks?project_id={sample_project['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_update_task_status_sets_completed(client, admin_headers, sample_project):
    t = client.post("/tasks", json={"title": "T", "project_id": sample_project["id"], "assignee_ids": []},
                    headers=admin_headers).json()
    r = client.patch(f"/tasks/{t['id']}", json={"status": "done"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["completed_at"] is not None


def test_delete_task(client, admin_headers, sample_project):
    t = client.post("/tasks", json={"title": "T", "project_id": sample_project["id"], "assignee_ids": []},
                    headers=admin_headers).json()
    r = client.delete(f"/tasks/{t['id']}", headers=admin_headers)
    assert r.status_code == 204


def test_task_with_assignees(client, admin_headers, sample_project):
    a = client.post("/assignees", json={"name": "Person", "email": "p@test.com"},
                    headers=admin_headers).json()
    t = client.post("/tasks", json={
        "title": "Assigned", "project_id": sample_project["id"], "assignee_ids": [a["id"]]},
        headers=admin_headers).json()
    assert len(t["assignees"]) == 1
    assert t["assignees"][0]["name"] == "Person"


def test_comment_on_task(client, admin_headers, sample_project):
    t = client.post("/tasks", json={"title": "T", "project_id": sample_project["id"], "assignee_ids": []},
                    headers=admin_headers).json()
    r = client.post(f"/tasks/{t['id']}/comments", json={"content": "Nice work", "author_id": None},
                    headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["content"] == "Nice work"
    # list comments
    r2 = client.get(f"/tasks/{t['id']}/comments", headers=admin_headers)
    assert len(r2.json()) == 1


def test_my_tasks(client, admin_headers, make_user, sample_project):
    dev_h = make_user("mydev@test.com", "developer")
    a = client.post("/assignees", json={"name": "MyDev", "email": "mydev@test.com"},
                    headers=admin_headers).json()
    client.post("/tasks", json={
        "title": "Mine", "project_id": sample_project["id"], "assignee_ids": [a["id"]]},
        headers=admin_headers)
    r = client.get("/tasks/mine", headers=dev_h)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Mine"


def test_negative_hours_rejected(client, admin_headers, sample_project):
    r = client.post("/tasks", json={
        "title": "Bad", "project_id": sample_project["id"],
        "estimated_hours": -5, "assignee_ids": []}, headers=admin_headers)
    assert r.status_code == 422