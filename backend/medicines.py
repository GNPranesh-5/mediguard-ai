from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from backend.ai.ollama_service import explain_medicine_from_images, parse_candidate_metadata
from backend.dependencies import get_current_user, get_db
from backend.models import Medicine, User
from backend.schemas import MedicineResponse, MedicineSearchResponse, MedicineSummaryResponse

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


class AISearchRequest(BaseModel):
    query: str
    strength: str = ""


@router.post("/search-ai")
def search_medicine_ai(
    body: AISearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Ask MedGemma to synthesise a medicine result for the given query.
    No database record is required. Returns at most one AI-generated result.
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query is required.")

    prompt_text = f"{query} {body.strength.strip()}".strip()

    try:
        explanation = explain_medicine_from_images(
            image_paths=[],  # text-only search: no image uploaded
            extracted_text=prompt_text,
        )
        meta = parse_candidate_metadata(explanation, extracted_text=prompt_text)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is temporarily unavailable.",
        )

    brand = meta.get("brand_name")
    generic = meta.get("generic_name")
    if not brand and not generic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The AI could not identify a specific medicine from this query.",
        )

    title = brand or generic
    if brand and meta.get("strength"):
        title = f"{brand} ({meta['strength']})"

    result = {
        "id": str(uuid4()),   # synthetic id — not a DB row yet
        "name": title,
        "brand_name": brand,
        "generic_name": generic,
        "strength": meta.get("strength"),
        "dosage_form": meta.get("dosage_form"),
        "manufacturer": meta.get("manufacturer"),
        "status": "needs_review",
        "simple_explanation": meta.get("simple_explanation"),
        "uses": meta.get("uses") or [],
        "how_it_works": meta.get("how_it_works"),
        "side_effects": meta.get("side_effects") or [],
        "warnings": meta.get("warnings") or [],
        "storage": meta.get("storage"),
        "label_dosage": meta.get("label_dosage"),
        "active_ingredients": meta.get("active_ingredients") or [],
        "sources": [],
        "ai_explanation": explanation,
        "aiGenerated": True,
    }

    return {"result": result}


@router.get("/search", response_model=MedicineSearchResponse)
def search_medicines(
    q: str = Query("", description="Search term for medicine name, brand name, or generic name"),
    db: Session = Depends(get_db),
):
    query_str = q.strip()
    if not query_str:
        # Return all medicines (limited to top 20) if query is empty
        stmt = select(Medicine).limit(20)
    else:
        pattern = f"%{query_str}%"
        stmt = select(Medicine).where(
            or_(
                Medicine.name.ilike(pattern),
                Medicine.brand_name.ilike(pattern),
                Medicine.generic_name.ilike(pattern),
            )
        ).limit(50)

    medicines = db.scalars(stmt).all()
    return MedicineSearchResponse(results=medicines)


@router.get("/{id}", response_model=MedicineResponse)
def get_medicine_by_id(
    id: UUID,
    db: Session = Depends(get_db),
):
    stmt = (
        select(Medicine)
        .options(
            joinedload(Medicine.active_ingredients),
            joinedload(Medicine.sources),
        )
        .where(Medicine.id == id)
    )
    medicine = db.scalar(stmt)

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found.",
        )

    return medicine
