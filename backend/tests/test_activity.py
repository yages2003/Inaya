"""Activity feed auto-logging tests."""


def test_activity_logged_on_project_create(client, admin_headers, sample_project):
    r = client.get("/activity", headers=admin_headers)
    assert r.status_code == 200
    events = r.json()
    assert any(e["event_type"] == "project_created" for e in events)


def test_activity_logged_on_task_create(client, admin_headers, sample_project):
    client.post("/tasks", json={"title": "T", "project_id": sample_project["id"], "assignee_ids": []},
                headers=admin_headers)
    events = client.get("/activity", headers=admin_headers).json()
    assert any(e["event_type"] == "task_created" for e in events)


def test_activity_logged_on_status_change(client, admin_headers, sample_project):
    t = client.post("/tasks", json={"title": "T", "project_id": sample_project["id"], "assignee_ids": []},
                    headers=admin_headers).json()
    client.patch(f"/tasks/{t['id']}", json={"status": "done"}, headers=admin_headers)
    events = client.get("/activity", headers=admin_headers).json()
    assert any(e["event_type"] == "task_status_changed" for e in events)


def test_activity_filter_by_project(client, admin_headers, sample_project):
    r = client.get(f"/activity?project_id={sample_project['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert all(e["project_id"] == sample_project["id"] for e in r.json())