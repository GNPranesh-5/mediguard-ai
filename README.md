# MediGuard AI — AI-Powered Medicine Identification and Information Assistant

MediGuard AI is a full-stack, AI-powered healthcare assistant designed to extract medicine packaging text, match candidate drug records against authoritative reference databases, generate cautious explanations via MedGemma, and securely manage user scan history.

---

## 1. System Architecture

```
MediGuard AI/
├── frontend/                     # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/           # Reusable UI widgets & ProtectedImage component
│   │   ├── pages/                # Scanner, Result, History, Saved, Auth pages
│   │   ├── services/             # API client (Bearer JWT auth, FormData upload)
│   │   └── styles/               # CSS design tokens and theme rules
│   ├── public/                   # Static icons and assets
│   ├── .env                      # Frontend config (VITE_API_BASE_URL, VITE_DEMO_MODE)
│   ├── package.json
│   └── vite.config.js
├── backend/                      # FastAPI Python Application
│   ├── main.py                   # FastAPI application root & router registration
│   ├── analyze.py                # Medicine image analysis pipeline (POST /api/analyze)
│   ├── auth.py                   # User registration, JWT login, and token revocation
│   ├── medicines.py              # Reference medicine lookup & search
│   ├── scans.py                  # Scan history, detail retrieval & safe deletion
│   ├── saved.py                  # Bookmark / Saved medicines management
│   ├── models.py                 # SQLAlchemy models (Neon PostgreSQL)
│   ├── schemas.py                # Pydantic v2 schemas
│   ├── database.py               # Database engine & session maker
│   ├── dependencies.py           # JWT auth & DB session dependencies
│   ├── security.py               # Password hashing & JWT creation/verification
│   ├── ai/
│   │   ├── ocr_service.py        # Subprocess bridge to PaddleOCR
│   │   ├── ocr_worker.py         # PaddleOCR worker script (runs in .venv-ocr)
│   │   ├── medicine_matcher.py   # Multi-candidate active ingredient matcher
│   │   └── ollama_service.py     # Local MedGemma 1.5:4B LLM integration
│   ├── tests/                    # Automated regression & security test suites
│   └── scripts/                  # Data source auditing & migration scripts
├── uploads/                      # Protected medicine uploads (never served publicly)
├── .venv/                        # FastAPI Python virtual environment
├── .venv-ocr/                    # Dedicated Python 3.10 environment for PaddleOCR
├── .env                          # Backend secrets & Neon PostgreSQL connection URL
├── start-backend.ps1             # Backend startup script
├── start-frontend.ps1            # Frontend startup script
├── start-dev.ps1                 # Dual-service startup script
└── rename-to-mediguard-ai.ps1    # Folder rename helper script
```

---

## 2. Prerequisites & Setup

1. **Python Environments**:
   - Backend environment (`.venv`): Python 3.10+ / 3.14 with FastAPI, SQLAlchemy, psycopg3, pyjwt, pwdlib, ollama.
   - OCR environment (`.venv-ocr`): Python 3.10 with `paddlepaddle` and `paddleocr`.
2. **Node.js**:
   - Node.js 18+ and npm.
3. **Database**:
   - Neon PostgreSQL instance configured via `DATABASE_URL` in root `.env`.
4. **Ollama**:
   - Ollama service running locally with model: `ollama run medgemma1.5:4b`.

---

## 3. Configuration

### Backend Configuration (`.env` at project root)
```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@<neon-host>/<db>?sslmode=require
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Frontend Configuration (`frontend/.env`)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_DEMO_MODE=false
```

---

## 4. Starting the Application

### Option A: Automatic Startup Scripts (PowerShell)
- **Start Both Servers**:
  ```powershell
  .\start-dev.ps1
  ```
- **Start Backend Only**:
  ```powershell
  .\start-backend.ps1
  ```
- **Start Frontend Only**:
  ```powershell
  .\start-frontend.ps1
  ```

### Option B: Manual Command Line
- **Backend**:
  ```powershell
  .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
  ```
- **Frontend**:
  ```bash
  cd frontend
  npm run dev
  ```

### Access URLs:
- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:8000`
- Swagger Docs: `http://127.0.0.1:8000/docs`
- Database Health: `http://127.0.0.1:8000/api/health/database`

---

## 5. Running Automated Tests

Run the backend automated regression suites from the project root:
```powershell
.\.venv\Scripts\python.exe -m unittest backend/tests/test_security_regression.py
cmd /c "set PYTHONPATH=.&& .\.venv\Scripts\python.exe backend/tests/test_matcher_regression.py"
.\.venv\Scripts\python.exe -m unittest backend/tests/test_ocr_automated.py
```

Build the frontend bundle:
```bash
cd frontend
npm run build
```

---

## 6. Security & Safety Guarantees

1. **Unverified Identity Guarantee**:
   OCR text extraction and reference database matching never equate to chemical or pharmaceutical verification. `identity_verified` is strictly `False` across all scans, and the UI displays mandatory unverified warnings.
2. **Protected Asset Storage**:
   Uploaded package images are never served through public static directories. The `GET /uploads/{filename}` endpoint enforces JWT authentication and scan ownership.
3. **Safe Scan Deletion**:
   Deleting a scan deletes the database row first, checks if any other scan references the file, and cleanly unlinks the image from disk. Shared reference medicine records in PostgreSQL are preserved (`ondelete="SET NULL"`).
4. **Memory Leak Prevention**:
   Frontend `ProtectedImage.jsx` converts authenticated image responses into temporary Blob URLs and revokes them (`URL.revokeObjectURL`) on image changes and component unmount.
