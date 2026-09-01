"""AI endpoint tests (estimation, insights generation) — uses fallback offline."""


def test_estimate_endpoint(client, admin_headers):
    r = client.post("/ai/estimate", json={
        "title": "Build feature", "category": "development", "priority": "high"},
        headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["estimated_hours"] >= 1
    assert body["source"] in ("groq", "fallback")


def test_estimate_requires_permission(client, make_user):
    vh = make_user("aiv@test.com", "viewer")
    r = client.post("/ai/estimate", json={"title": "X", "category": "development", "priority": "low"},
                    headers=vh)
    assert r.status_code == 403


def test_generate_insights(client, admin_headers, sample_project):
    client.post("/tasks", json={
        "title": "Blocked task", "project_id": sample_project["id"],
        "status": "blocked", "assignee_ids": []}, headers=admin_headers)
    r = client.post(f"/ai/projects/{sample_project['id']}/generate", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["summary"]["progress_summary"]
    assert body["summary"]["source"] in ("gemini", "fallback")
    # a blocked task should surface a dependency bottleneck risk
    assert any(rk["scenario"] == "dependency_bottleneck" for rk in body["risks"])


def test_get_insights_after_generate(client, admin_headers, sample_project):
    client.post(f"/ai/projects/{sample_project['id']}/generate", headers=admin_headers)
    r = client.get(f"/ai/projects/{sample_project['id']}/insights", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["summary"]["progress_summary"]


def test_generate_insights_missing_project(client, admin_headers):
    r = client.post("/ai/projects/99999/generate", headers=admin_headers)
    assert r.status_code == 404