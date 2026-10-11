from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.analyze import router as analyze_router
from backend.auth import router as auth_router
from backend.database import test_database_connection
from backend.medicines import router as medicines_router
from backend.scans import image_router, router as scans_router
from backend.saved import router as saved_router

# Ensure uploads directory exists
PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="MediGuard AI API",
    description="Backend for the MediGuard AI medicine information assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "https://mediguard-ai-kappa.vercel.app",
        "https://mediguard-92i0mf3po-gn-pranesh-s-projects1.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
)

app.include_router(auth_router)
app.include_router(medicines_router)
app.include_router(analyze_router)
app.include_router(scans_router)
app.include_router(saved_router)
app.include_router(image_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to MediGuard AI",
        "status": "Backend is running",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/health/database")
def database_health_check():
    try:
        test_database_connection()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check the backend configuration.",
        )
