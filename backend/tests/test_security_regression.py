import os
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal
from backend.models import User, Scan, Medicine
from backend.security import hash_password, create_access_token

class TestSecurityRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Create test users in DB
        with SessionLocal() as db:
            u1 = db.query(User).filter(User.email == 'sec_u1@example.com').first()
            if not u1:
                u1 = User(name='Sec User 1', email='sec_u1@example.com', hashed_password=hash_password('pass123'))
                db.add(u1)
                db.commit()
                db.refresh(u1)
            cls.u1 = u1
            cls.token1 = create_access_token(user_id=str(u1.id))

            u2 = db.query(User).filter(User.email == 'sec_u2@example.com').first()
            if not u2:
                u2 = User(name='Sec User 2', email='sec_u2@example.com', hashed_password=hash_password('pass123'))
                db.add(u2)
                db.commit()
                db.refresh(u2)
            cls.u2 = u2
            cls.token2 = create_access_token(user_id=str(u2.id))

        cls.headers1 = {'Authorization': f'Bearer {cls.token1}'}
        cls.headers2 = {'Authorization': f'Bearer {cls.token2}'}

    def test_01_unauthenticated_image_access_fails(self):
        """Unauthenticated GET to /uploads/{filename} must return HTTP 401."""
        response = self.client.get('/uploads/nonexistent_image.jpg')
        self.assertEqual(response.status_code, 401)

    def test_02_path_traversal_attempts_fail(self):
        """Path traversal patterns in image request must return HTTP 404 or 401."""
        response = self.client.get('/uploads/../.env', headers=self.headers1)
        self.assertIn(response.status_code, [404, 400])

    def test_03_authenticated_upload_and_cross_user_isolation(self):
        """Uploaded image is accessible to owner, but hidden (404) from other users."""
        dummy_img = b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xD9'
        res = self.client.post('/api/analyze', files={'file': ('sec_unit.jpg', dummy_img, 'image/jpeg')}, headers=self.headers1)
        self.assertEqual(res.status_code, 201)
        
        data = res.json()
        scan_id = data['scan']['id']
        image_url = data['scan']['image_url']
        filename = image_url.rsplit('/', 1)[-1]
        img_file_path = Path('uploads') / filename

        self.assertTrue(img_file_path.exists(), "Uploaded file should exist on disk")

        # Owner can access
        owner_fetch = self.client.get(image_url, headers=self.headers1)
        self.assertEqual(owner_fetch.status_code, 200)

        # Other user cannot access image (404)
        other_fetch = self.client.get(image_url, headers=self.headers2)
        self.assertEqual(other_fetch.status_code, 404)

        # Other user cannot access scan detail (404)
        other_detail = self.client.get(f'/api/scans/{scan_id}', headers=self.headers2)
        self.assertEqual(other_detail.status_code, 404)

        # Other user cannot delete scan (404)
        other_del = self.client.delete(f'/api/scans/{scan_id}', headers=self.headers2)
        self.assertEqual(other_del.status_code, 404)

        # Owner can delete scan (204)
        owner_del = self.client.delete(f'/api/scans/{scan_id}', headers=self.headers1)
        self.assertEqual(owner_del.status_code, 204)

        # File is safely unlinked from disk
        self.assertFalse(img_file_path.exists(), "Image file should be unlinked on scan deletion")

    def test_04_shared_medicine_record_preserved_on_scan_deletion(self):
        """Deleting a scan must not delete shared Medicine reference records."""
        with SessionLocal() as db:
            med_count_before = db.query(Medicine).count()
            self.assertGreater(med_count_before, 0, "Reference database should contain medicine records")

        dummy_img = b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xD9'
        res = self.client.post('/api/analyze', files={'file': ('paracetamol.jpg', dummy_img, 'image/jpeg')}, headers=self.headers1)
        self.assertEqual(res.status_code, 201)
        scan_id = res.json()['scan']['id']

        # Delete the scan
        del_res = self.client.delete(f'/api/scans/{scan_id}', headers=self.headers1)
        self.assertEqual(del_res.status_code, 204)

        # Verify medicine records count is unchanged
        with SessionLocal() as db:
            med_count_after = db.query(Medicine).count()
            self.assertEqual(med_count_before, med_count_after, "Deleting scan must NOT delete shared medicine reference records")

    def test_05_auth_lifecycle(self):
        """User registration, duplicate prevention, and login lifecycle."""
        test_email = "lifecycle_test@example.com"
        reg_payload = {"name": "Lifecycle User", "email": test_email, "password": "SecurePassword123!"}
        
        # Clean up if already exists
        with SessionLocal() as db:
            existing = db.query(User).filter(User.email == test_email).first()
            if existing:
                db.delete(existing)
                db.commit()

        # Register
        r_reg = self.client.post("/auth/register", json=reg_payload)
        self.assertEqual(r_reg.status_code, 201)
        self.assertIn("token", r_reg.json())

        # Duplicate registration fails with 409 Conflict
        r_dup = self.client.post("/auth/register", json=reg_payload)
        self.assertEqual(r_dup.status_code, 409)

        # Login
        r_login = self.client.post("/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
        self.assertEqual(r_login.status_code, 200)
        token = r_login.json()["token"]

        # Current user /auth/me
        r_me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r_me.status_code, 200)
        self.assertEqual(r_me.json()["email"], test_email)

    def test_06_saved_medicines_and_user_isolation(self):
        """Saving and removing medicines with user isolation."""
        with SessionLocal() as db:
            med = db.query(Medicine).first()
            self.assertIsNotNone(med, "Medicine reference database should contain at least 1 record")
            med_id = str(med.id)

        # User 1 saves medicine
        r_save = self.client.put(f"/api/saved/{med_id}", headers=self.headers1)
        self.assertEqual(r_save.status_code, 204)

        # User 1 retrieves saved medicines
        r_list1 = self.client.get("/api/saved", headers=self.headers1)
        self.assertEqual(r_list1.status_code, 200)
        saved_ids_u1 = [m["id"] for m in r_list1.json().get("medicines", [])]
        self.assertIn(med_id, saved_ids_u1)

        # User 2 does NOT see User 1's saved medicines (user isolation)
        r_list2 = self.client.get("/api/saved", headers=self.headers2)
        self.assertEqual(r_list2.status_code, 200)
        saved_ids_u2 = [m["id"] for m in r_list2.json().get("medicines", [])]
        self.assertNotIn(med_id, saved_ids_u2)

        # User 1 removes saved medicine
        r_del = self.client.delete(f"/api/saved/{med_id}", headers=self.headers1)
        self.assertEqual(r_del.status_code, 204)

        # User 1 list is now empty of this medicine
        r_list1_after = self.client.get("/api/saved", headers=self.headers1)
        saved_ids_after = [m["id"] for m in r_list1_after.json().get("medicines", [])]
        self.assertNotIn(med_id, saved_ids_after)

    def test_07_medicine_search_and_details(self):
        """Medicine search endpoint returns results array and details endpoint succeeds."""
        r_search = self.client.get("/api/medicines/search?q=Paracetamol")
        self.assertEqual(r_search.status_code, 200)
        data = r_search.json()
        self.assertIn("results", data)
        self.assertGreater(len(data["results"]), 0)

        med_id = data["results"][0]["id"]
        r_detail = self.client.get(f"/api/medicines/{med_id}")
        self.assertEqual(r_detail.status_code, 200)
        detail_data = r_detail.json()
        self.assertEqual(detail_data["id"], med_id)
        self.assertIn("sources", detail_data)
        self.assertIn("active_ingredients", detail_data)

if __name__ == '__main__':
    unittest.main()
