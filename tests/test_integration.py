import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient


# Ensure project packages are importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "CHAT BOT" / "backend"))

# Load admin credentials from backend/.env when running in Docker/test environment
load_dotenv(ROOT / "backend" / ".env")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def test_backend_root():
    from app.main import app as backend_app

    client = TestClient(backend_app)
    r = client.get("/")
    assert r.status_code == 200
    assert "Backend is running" in r.json().get("message", "")


def test_backend_test_db():
    from app.main import app as backend_app

    client = TestClient(backend_app)
    r = client.get("/test-db")
    assert r.status_code == 200
    assert r.json().get("result") == 1


def test_admin_login():
    from app.main import app as backend_app

    client = TestClient(backend_app)
    r = client.post(
        "/admin/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200
    assert r.json().get("token_type") == "bearer"


def test_customer_login_and_protected_route():
    from app.main import app as backend_app

    client = TestClient(backend_app)
    r = client.post(
        "/customers/",
        json={
            "customer_name": "Auth User",
            "customer_email": f"auth{__import__('time').time_ns()}@example.com",
            "phone_number": "0123456789",
            "address": "Auth Address",
            "password": "123456",
        },
    )
    assert r.status_code == 201
    customer = r.json()

    r = client.post(
        "/customers/login",
        json={"email_or_phone": customer["customer_email"], "password": "123456"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get(
        f"/customers/{customer['customer_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200


def test_chatbot_health_and_chat():
    try:
        from standalone_app import app as chatbot_app
    except Exception:
        pytest.skip("Chatbot app could not be imported")

    client = TestClient(chatbot_app)
    r = client.get("/health")
    assert r.status_code == 200

    r = client.post("/api/chatbot", json={"message": "xin chao"})
    assert r.status_code == 200
    j = r.json()
    assert "response" in j and isinstance(j["response"], str)
