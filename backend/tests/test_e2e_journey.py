import os
import uuid
import time
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.main import app
from backend.database import SessionLocal
from backend.models import User, Scan, Medicine, SavedMedicine

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def test_full_user_journey():
    client = TestClient(app)

    # 1. Health checks
    print("--- 1. Testing Health Checks ---")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert res.json()["status"] == "Backend is running"

    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res = client.get("/api/health/database")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    assert res.json()["database"] == "connected"

    res = client.get("/docs")
    assert res.status_code == 200
    print("Health checks passed.")

    # 2. CORS Preflight (OPTIONS)
    print("--- 2. Testing CORS Preflight Requests ---")
    cors_headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    }
    
    res = client.options("/auth/register", headers=cors_headers)
    assert res.status_code == 200, f"OPTIONS /auth/register returned {res.status_code}: {res.text}"
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert res.headers.get("access-control-allow-credentials") == "true"
    print("OPTIONS /auth/register preflight passed.")

    cors_headers_127 = {
        "Origin": "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    }
    res = client.options("/auth/login", headers=cors_headers_127)
    assert res.status_code == 200, f"OPTIONS /auth/login returned {res.status_code}: {res.text}"
    assert res.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
    print("OPTIONS /auth/login preflight passed.")

    # 3. Registration
    print("--- 3. Testing Registration ---")
    test_id = int(time.time())
    email = f"journey_{test_id}@example.com"
    password = "SecurePassword123!"
    name = f"Test User {test_id}"

    # Invalid registration (password too short)
    res = client.post("/auth/register", json={"name": name, "email": email, "password": "short"})
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"

    # Successful registration
    res = client.post("/auth/register", json={"name": name, "email": email, "password": password})
    assert res.status_code == 201, f"Register failed: {res.status_code} {res.text}"
    reg_data = res.json()
    assert "user" in reg_data
    assert "token" in reg_data
    assert reg_data["user"]["email"] == email.lower()
    user_id = reg_data["user"]["id"]
    print(f"User registered with ID: {user_id}")

    # Duplicate registration
    res = client.post("/auth/register", json={"name": name, "email": email, "password": password})
    assert res.status_code == 409, f"Duplicate registration did not return 409: {res.status_code}"
    print("Duplicate registration rejected properly.")

    # 4. Login
    print("--- 4. Testing Login ---")
    # Invalid login credentials
    res = client.post("/auth/login", json={"email": email, "password": "WrongPassword"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Valid login credentials
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.status_code} {res.text}"
    login_data = res.json()
    token = login_data["token"]
    assert token
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("Login succeeded, JWT token received.")

    # 5. Authenticated /auth/me and persistence
    print("--- 5. Testing /auth/me and DB persistence ---")
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == email.lower()

    # Verify user persists in Neon DB directly
    with SessionLocal() as db:
        user_in_db = db.scalar(select(User).where(User.email == email.lower()))
        assert user_in_db is not None
        assert user_in_db.hashed_password != password
        assert "argon2" in user_in_db.hashed_password or "bcrypt" in user_in_db.hashed_password or "$" in user_in_db.hashed_password
    print("User persistence and password hashing verified in database.")

    # 6. Saved Medicines
    print("--- 6. Testing Saved Medicines ---")
    with SessionLocal() as db:
        med = db.scalars(select(Medicine)).first()
    assert med is not None, "At least one medicine reference record must exist in DB."
    med_id = str(med.id)

    # Initially empty
    res = client.get("/api/saved", headers=auth_headers)
    assert res.status_code == 200
    initial_saved = res.json().get("medicines", [])
    assert not any(m["id"] == med_id for m in initial_saved)

    # Save medicine
    res = client.put(f"/api/saved/{med_id}", headers=auth_headers)
    assert res.status_code == 204

    # Check it is in saved list
    res = client.get("/api/saved", headers=auth_headers)
    assert res.status_code == 200
    assert any(m["id"] == med_id for m in res.json().get("medicines", []))

    # Remove medicine
    res = client.delete(f"/api/saved/{med_id}", headers=auth_headers)
    assert res.status_code == 204

    # Verify removed
    res = client.get("/api/saved", headers=auth_headers)
    assert not any(m["id"] == med_id for m in res.json().get("medicines", []))
    print("Saved medicines lifecycle verified.")

    # 7. Medicine Scanning End-to-End
    print("--- 7. Testing Medicine Scanning Pipeline ---")
    sample_img_path = PROJECT_ROOT / "sample_medicine_label.png"
    assert sample_img_path.is_file(), f"Missing sample image at {sample_img_path}"

    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    res = client.post(
        "/api/analyze",
        files={"file": ("sample_medicine_label.png", img_bytes, "image/png")},
        headers=auth_headers,
    )
    assert res.status_code == 201, f"Analyze failed: {res.status_code} {res.text}"
    scan_data = res.json()
    assert "scan" in scan_data
    scan_id = scan_data["scan"]["id"]
    image_url = scan_data["scan"]["image_url"]
    filename = image_url.rsplit("/", 1)[-1]
    
    # Requirement: identity_verified MUST remain False
    assert scan_data["medicine_match"]["identity_verified"] is False
    assert scan_data["scan"]["status"] == "needs_review"
    assert "ocr_lines" in scan_data
    print(f"Scan created with ID {scan_id}, status: {scan_data['scan']['status']}, identity_verified: {scan_data['medicine_match']['identity_verified']}")

    # 8. Scan Retrieval & Protected Image Access
    print("--- 8. Testing Protected Image and Scan Retrieval ---")
    # Owner can get scan
    res = client.get(f"/api/scans/{scan_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["scan"]["id"] == scan_id

    # Owner can get image
    res = client.get(f"/uploads/{filename}", headers=auth_headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/")

    # Unauthenticated cannot get image
    res = client.get(f"/uploads/{filename}")
    assert res.status_code == 401

    # Cross-user isolation: register a second user
    u2_email = f"journey_u2_{test_id}@example.com"
    res2 = client.post("/auth/register", json={"name": "User Two", "email": u2_email, "password": password})
    assert res2.status_code == 201
    u2_token = res2.json()["token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 2 cannot access User 1's scan
    res = client.get(f"/api/scans/{scan_id}", headers=u2_headers)
    assert res.status_code == 404

    # User 2 cannot access User 1's image
    res = client.get(f"/uploads/{filename}", headers=u2_headers)
    assert res.status_code == 404
    print("Cross-user isolation verified for scans and protected images.")

    # 9. Scan History and Safe Deletion
    print("--- 9. Testing History and Safe Scan Deletion ---")
    res = client.get("/api/scans", headers=auth_headers)
    assert res.status_code == 200
    assert any(s["id"] == scan_id for s in res.json().get("scans", []))

    # User 2 cannot delete User 1's scan
    res = client.delete(f"/api/scans/{scan_id}", headers=u2_headers)
    assert res.status_code == 404

    # User 1 deletes scan
    saved_file_path = PROJECT_ROOT / "uploads" / filename
    assert saved_file_path.exists(), "Image file should exist before deletion"

    res = client.delete(f"/api/scans/{scan_id}", headers=auth_headers)
    assert res.status_code == 204

    # Verify scan deleted from DB
    with SessionLocal() as db:
        deleted_scan = db.get(Scan, uuid.UUID(scan_id))
        assert deleted_scan is None

    # Verify image cleaned up from filesystem
    assert not saved_file_path.exists(), "Image file should be unlinked after scan deletion"
    print("Safe scan deletion and image cleanup verified.")

    # 10. Logout and Token Revocation
    print("--- 10. Testing Logout and Token Revocation ---")
    res = client.post("/auth/logout", headers=auth_headers)
    assert res.status_code == 204

    # Subsequent request with revoked token fails
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 401
    print("Logout and token revocation verified.")

    print("\n==========================================")
    print("ALL 10 END-TO-END JOURNEY CHECKS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    test_full_user_journey()
