"""
Inaya — pytest fixtures.

Spins up an isolated test database (Inaya_test), points the app at it via
dependency override, and creates fresh tables per test session. Provides a
TestClient plus helper fixtures for authenticated requests as different roles.
"""

import os
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point at the test DB BEFORE importing app modules that read the env.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/inaya_db_test"
)
os.environ.setdefault("SECRET_KEY", "test-secret")

import database  # noqa: E402
from database import Base  # noqa: E402

# Dedicated test engine/session
test_engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Make the app's SessionLocal/engine use the test DB too
database.engine = test_engine
database.SessionLocal = TestingSessionLocal

import models  # noqa: E402,F401
from main import app  # noqa: E402
from database import get_db  # noqa: E402


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Wipe all rows before each test for isolation."""
    db = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()
    yield


@pytest.fixture
def client():
    return TestClient(app)


# ---- Auth helpers ----

def _register(client, name, email, password="password123"):
    return client.post("/auth/register", json={"name": name, "email": email, "password": password})


def _login(client, email, password="password123"):
    r = client.post("/auth/login",
                    data={"username": email, "password": password},
                    headers={"Content-Type": "application/x-www-form-urlencoded"})
    return r


def _auth_header(client, email, password="password123"):
    r = _login(client, email, password)
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client):
    """First registered user becomes super_admin."""
    _register(client, "Admin", "admin@test.com")
    return _auth_header(client, "admin@test.com")


@pytest.fixture
def make_user(client, admin_headers):
    """Factory: create a user and set their role (as admin), return their headers."""
    def _make(email, role, name=None):
        _register(client, name or email.split("@")[0], email)
        # find the user id
        users = client.get("/auth/users", headers=admin_headers).json()
        uid = next(u["id"] for u in users if u["email"] == email)
        client.patch(f"/auth/users/{uid}/role", json={"role": role}, headers=admin_headers)
        return _auth_header(client, email)
    return _make


@pytest.fixture
def sample_project(client, admin_headers):
    today = date.today()
    r = client.post("/projects", json={
        "name": "Test Project", "key": "TP", "description": "A test project",
        "status": "on_track",
        "start_date": str(today - timedelta(days=5)),
        "end_date": str(today + timedelta(days=25)),
    }, headers=admin_headers)
    return r.json()