"""Auth & user management tests."""
from datetime import date, timedelta


def test_first_user_is_super_admin(client):
    r = client.post("/auth/register", json={
        "name": "First", "email": "first@test.com", "password": "password123"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "super_admin"
    assert body["access_token"]
    assert len(body["user"]["permissions"]) == 13  # all perms


def test_second_user_is_viewer(client):
    client.post("/auth/register", json={"name": "A", "email": "a@test.com", "password": "password123"})
    r = client.post("/auth/register", json={"name": "B", "email": "b@test.com", "password": "password123"})
    assert r.json()["user"]["role"] == "viewer"


def test_duplicate_email_rejected(client):
    client.post("/auth/register", json={"name": "A", "email": "dup@test.com", "password": "password123"})
    r = client.post("/auth/register", json={"name": "B", "email": "dup@test.com", "password": "password123"})
    assert r.status_code == 409


def test_login_success(client):
    client.post("/auth/register", json={"name": "A", "email": "login@test.com", "password": "password123"})
    r = client.post("/auth/login",
                    data={"username": "login@test.com", "password": "password123"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/auth/register", json={"name": "A", "email": "wp@test.com", "password": "password123"})
    r = client.post("/auth/login",
                    data={"username": "wp@test.com", "password": "wrongpass"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 401


def test_login_nonexistent_user(client):
    r = client.post("/auth/login",
                    data={"username": "ghost@test.com", "password": "password123"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 401


def test_me_endpoint(client, admin_headers):
    r = client.get("/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test.com"


def test_me_requires_auth(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_short_password_rejected(client):
    r = client.post("/auth/register", json={"name": "A", "email": "sp@test.com", "password": "123"})
    assert r.status_code == 422  # pydantic validation


def test_invalid_email_rejected(client):
    r = client.post("/auth/register", json={"name": "A", "email": "not-an-email", "password": "password123"})
    assert r.status_code == 422