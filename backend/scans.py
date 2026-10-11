import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.dependencies import get_current_user, get_db
from backend.models import Medicine, Scan, User
from backend.ai.ollama_service import parse_candidate_metadata
from backend.schemas import (
    ActiveIngredientResponse,
    AnalyzeResponse,
    MatchedMedicineResponse,
    MedicineMatchResponse,
    OCRLineResponse,
    ScanHistoryItem,
    ScanHistoryResponse,
    ScanResponse,
    SourceResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scans", tags=["Scans"])
image_router = APIRouter(tags=["Protected uploads"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = (PROJECT_ROOT / "uploads").resolve()
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@image_router.get("/uploads/{filename}")
def get_protected_upload(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve an uploaded image only to the scan's owner."""
    if (
        not filename
        or Path(filename).name != filename
        or "/" in filename
        or "\\" in filename
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found.",
        )

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found.",
        )

    image_path = (UPLOAD_DIR / filename).resolve()

    if image_path.parent != UPLOAD_DIR or not image_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found.",
        )

    image_url_path = f"/uploads/{filename}"
    stmt = select(Scan.id).where(
        Scan.image_url == image_url_path, Scan.user_id == current_user.id
    )
    scan_exists = db.scalar(stmt) is not None

    if not scan_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found or access denied.",
        )

    return FileResponse(image_path)


def build_medicine_response(medicine: Medicine | None) -> MatchedMedicineResponse | None:
    if medicine is None:
        return None
    return MatchedMedicineResponse(
        id=medicine.id,
        name=medicine.name,
        brand_name=medicine.brand_name,
        generic_name=medicine.generic_name,
        strength=medicine.strength,
        dosage_form=medicine.dosage_form,
        manufacturer=medicine.manufacturer,
        status=medicine.status,
        simple_explanation=medicine.simple_explanation,
        uses=medicine.uses or [],
        how_it_works=medicine.how_it_works,
        side_effects=medicine.side_effects or [],
        warnings=medicine.warnings or [],
        contraindications=medicine.contraindications or [],
        storage=medicine.storage,
        label_dosage=medicine.label_dosage,
        sources=[SourceResponse.model_validate(s) for s in medicine.sources],
        active_ingredients=[
            ActiveIngredientResponse.model_validate(a)
            for a in medicine.active_ingredients
        ],
    )


@router.get("", response_model=ScanHistoryResponse)
def get_user_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all scans belonging to the currently authenticated user."""
    stmt = (
        select(Scan)
        .options(selectinload(Scan.medicine))
        .where(Scan.user_id == current_user.id)
        .order_by(Scan.scanned_at.desc())
    )
    scans = db.scalars(stmt).all()

    items = []
    for scan in scans:
        medicine_name = None
        if scan.medicine:
            medicine_name = scan.medicine.name
        elif scan.ai_explanation:
            meta = parse_candidate_metadata(scan.ai_explanation, scan.extracted_text or "")
            b = meta.get("brand_name")
            g = meta.get("generic_name")
            s = meta.get("strength")
            if b and s:
                medicine_name = f"{b} ({s})"
            else:
                medicine_name = b or g

        items.append(
            ScanHistoryItem(
                id=scan.id,
                medicine_id=scan.medicine_id,
                scanned_at=scan.scanned_at,
                status=scan.status,
                image_url=scan.image_url,
                demo=scan.demo,
                medicine_name=medicine_name,
            )
        )

    return ScanHistoryResponse(scans=items)


@router.get("/{scan_id}", response_model=AnalyzeResponse)
def get_scan_by_id(
    scan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a specific scan by ID with complete persisted analysis data."""
    stmt = (
        select(Scan)
        .options(
            selectinload(Scan.medicine).selectinload(Medicine.sources),
            selectinload(Scan.medicine).selectinload(Medicine.active_ingredients),
        )
        .where(Scan.id == scan_id, Scan.user_id == current_user.id)
    )
    scan_record = db.scalars(stmt).first()

    if scan_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or access denied.",
        )

    matched_record = scan_record.medicine
    medicine_response = None
    source_responses = []

    if matched_record is not None:
        medicine_response = build_medicine_response(matched_record)
        source_responses = [
            SourceResponse.model_validate(s) for s in matched_record.sources
        ]
    elif scan_record.ai_explanation:
        # Reconstruct candidate metadata for unlisted medicine scan
        candidate_meta = parse_candidate_metadata(
            scan_record.ai_explanation,
            scan_record.extracted_text or "",
        )
        candidate_brand = candidate_meta.get("brand_name")
        candidate_generic = candidate_meta.get("generic_name")
        candidate_strength = candidate_meta.get("strength")

        if candidate_brand or candidate_generic:
            candidate_title = candidate_brand or candidate_generic or "Unverified Package"
            if candidate_brand and candidate_strength:
                candidate_title = f"{candidate_brand} ({candidate_strength})"

            active_ings = [
                ActiveIngredientResponse(
                    id=UUID(ing["id"]) if isinstance(ing["id"], str) else ing["id"],
                    name=ing["name"],
                    strength=ing.get("strength"),
                )
                for ing in candidate_meta.get("active_ingredients", [])
            ]

            medicine_response = MatchedMedicineResponse(
                id=scan_record.id,
                name=candidate_title,
                brand_name=candidate_brand,
                generic_name=candidate_generic,
                strength=candidate_strength,
                dosage_form=candidate_meta.get("dosage_form"),
                manufacturer=candidate_meta.get("manufacturer"),
                status="needs_review",
                simple_explanation=candidate_meta.get("simple_explanation"),
                uses=candidate_meta.get("uses") or [],
                how_it_works=candidate_meta.get("how_it_works"),
                side_effects=candidate_meta.get("side_effects") or [],
                warnings=candidate_meta.get("warnings") or [],
                storage=candidate_meta.get("storage"),
                label_dosage=candidate_meta.get("label_dosage"),
                active_ingredients=active_ings,
                sources=[],
            )

    ocr_lines = [
        OCRLineResponse(
            text=line.get("text", ""),
            confidence=float(line.get("confidence", 0.0)),
            source=line.get("source"),
        )
        for line in (scan_record.ocr_lines or [])
        if isinstance(line, dict)
    ]

    analysis_status = "completed" if scan_record.extracted_text else "no_text_found"

    return AnalyzeResponse(
        scan=ScanResponse.model_validate(scan_record),
        extracted_text=scan_record.extracted_text or "",
        ocr_lines=ocr_lines,
        ai_explanation=scan_record.ai_explanation,
        analysis_status=analysis_status,
        medicine_match=MedicineMatchResponse(
            match_status=scan_record.match_status or "needs_review",
            match_reason=scan_record.match_reason or "Manual review is required.",
            identity_verified=scan_record.identity_verified or False,
            medicine=medicine_response,
        ),
        matched_medicine=medicine_response,
        sources=source_responses,
    )


def remove_scan_image(image_url: str | None) -> None:
    """Remove a scan image only when its path is safe and contained."""
    if not image_url:
        return
    filename = image_url.rsplit("/", 1)[-1]
    if (
        not filename
        or Path(filename).name != filename
        or "/" in filename
        or "\\" in filename
        or Path(filename).suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS
    ):
        logger.warning("Skipped unsafe scan image path during cleanup.")
        return

    image_path = (UPLOAD_DIR / filename).resolve()
    if image_path.parent != UPLOAD_DIR:
        logger.warning("Skipped image outside uploads directory.")
        return

    try:
        image_path.unlink(missing_ok=True)
    except OSError:
        logger.exception("Could not remove scan image file: %s", filename)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan_by_id(
    scan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the user's scan and clean up its image."""
    stmt = select(Scan).where(
        Scan.id == scan_id,
        Scan.user_id == current_user.id,
    )
    scan_record = db.scalars(stmt).first()

    if scan_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or access denied.",
        )

    image_url = scan_record.image_url

    # Avoid removing a file if another scan still references it.
    other_scan_stmt = select(Scan.id).where(
        Scan.image_url == image_url,
        Scan.id != scan_record.id,
    )
    shared_image = (
        db.scalar(other_scan_stmt) is not None if image_url else False
    )

    try:
        db.delete(scan_record)
        db.commit()
    except Exception:
        db.rollback()
        raise

    if not shared_image:
        remove_scan_image(image_url)

    return None
