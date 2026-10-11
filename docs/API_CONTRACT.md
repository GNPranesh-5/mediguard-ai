# Proposed backend contract (for FastAPI, built later)

Base URL: `VITE_API_BASE_URL`. All responses are JSON. Errors: `{ "detail": "message" }` with a 4xx/5xx status.
Missing/unknown medicine fields must be `null`, never invented.

## Medicine object
```json
{
  "id": "string", "name": "string", "brandName": "string|null", "genericName": "string|null",
  "activeIngredients": [{ "name": "string", "strength": "string|null" }],
  "strength": "string|null", "dosageForm": "string|null",
  "manufacturer": "string|null", "batch": "string|null", "expiry": "string|null",
  "uses": ["string"]|null, "howItWorks": "string|null",
  "sideEffects": ["string"]|null, "warnings": ["string"]|null, "contraindications": ["string"]|null,
  "storage": "string|null", "labelDosage": "string|null",
  "sources": [{ "name": "string", "url": "string|null" }],
  "extractedText": "string|null", "simpleExplanation": "string|null",
  "status": "ai_suggestion | reference_matched | needs_review | not_detected | unavailable"
}
```
## Scan object
```json
{ "id": "string", "scannedAt": "ISO-8601", "medicineId": "string|null", "medicineName": "string|null",
  "status": "same values as above", "imageUrl": "string|null", "demo": false }
```

## Endpoints

| Frontend function | Method and path | Request | Response |
|---|---|---|---|
| analyzeMedicine | `POST /api/analyze` | multipart: `front_image` (required), `back_image` (optional) | `{ "scan": Scan, "medicine": Medicine\|null }` |
| searchMedicines | `GET /api/medicines/search?q=&strength=` | query string | `{ "results": Medicine[] }` |
| getMedicineDetails | `GET /api/medicines/{id}` | none | `Medicine` (404 if unknown) |
| getScanHistory | `GET /api/scans` | none | `{ "scans": Scan[] }` |
| getScan | `GET /api/scans/{id}` | none | `{ "scan": Scan, "medicine": Medicine\|null }` |
| deleteScan | `DELETE /api/scans/{id}` | none | `204` |
| getSavedMedicines | `GET /api/saved` | none | `{ "medicines": Medicine[] }` |
| saveMedicine | `PUT /api/saved/{id}` | none | `204` |
| removeSavedMedicine | `DELETE /api/saved/{id}` | none | `204` |

Notes: the backend must re-validate image type (JPEG/PNG/WebP) and size (8 MB); the frontend check is only a convenience. `imageUrl` must be loadable by the browser. Status `404`/`501` makes the UI show "backend integration pending". Authentication headers are included in request() in api.js (see Authentication endpoints section below).

---

# Authentication endpoints (added)

Used only when `VITE_DEMO_MODE=false`. In demo mode accounts live in the browser (see README, "Authentication and camera").
The frontend stores the returned `token` (one helper: `src/services/session.js`) and sends `Authorization: Bearer <token>` on every request (`request()` in `src/services/api.js`). To use cookies instead, change `session.js` and add `credentials: 'include'` in `request()`.

**User object:** `{ "id": "string", "name": "string", "email": "string" }` (never return password data).

| Frontend function | Method and path | Request body | Success response | Error shape |
|---|---|---|---|---|
| registerUser | `POST /auth/register` | `{ "name": "string", "email": "string", "password": "string" }` | `201 { "user": User, "token": "string" }` | `409 { "detail": "An account with this email already exists." }`, `422 { "detail": "..." }` for invalid input |
| loginUser | `POST /auth/login` | `{ "email": "string", "password": "string" }` | `200 { "user": User, "token": "string" }` | `401 { "detail": "Email or password is incorrect." }` (same message for unknown email and wrong password) |
| logoutUser | `POST /auth/logout` | none (bearer token) | `204` | `401` if the token is invalid (the frontend logs out locally anyway) |
| getCurrentUser | `GET /auth/me` | none (bearer token) | `200 { "user": User }` | `401 { "detail": "Not authenticated." }` |

Notes: validate email format and password rules (at least 8 characters, a letter and a number) on the server too; hash passwords with bcrypt or argon2; all `/api/scans*`, `/api/saved*` and `/api/analyze` endpoints should require the token and return only the signed-in user's data (`401` otherwise). A `404`/`501` or an unreachable server makes the UI show "integration pending / service unavailable".
