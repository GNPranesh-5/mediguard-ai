import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.ai.medicine_matcher import find_medicine_reference
from backend.ai.ocr_service import consolidate_ocr_results, extract_text_from_image
from backend.ai.ollama_service import (
    explain_medicine_from_images,
    parse_candidate_metadata,
)

from backend.dependencies import get_current_user, get_db
from backend.models import Scan, User
from backend.schemas import (
    ActiveIngredientResponse,
    AnalyzeResponse,
    MatchedMedicineResponse,
    MedicineMatchResponse,
    OCRLineResponse,
    ScanResponse,
    SourceResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp"
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_uploaded_image(file: UploadFile) -> Path:
    """Validate and securely write an uploaded image to the uploads directory."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed types are JPEG, PNG, WEBP.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed extensions are .jpg, .jpeg, .png, .webp.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the 10 MB limit (Size: {len(file_bytes) / (1024*1024):.2f} MB).",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    unique_filename = f"{uuid.uuid4()}{ext}"
    saved_file_path = UPLOAD_DIR / unique_filename

    with open(saved_file_path, "wb") as f:
        f.write(file_bytes)

    return saved_file_path


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_and_analyze_image(
    file: UploadFile = File(...),
    back_file: UploadFile | None = File(None),
    demo: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Validate and save primary (front) image
    saved_front_path = await save_uploaded_image(file)

    # 2. Validate and save secondary (back) image if provided
    saved_back_path = None
    if back_file is not None and back_file.filename:
        saved_back_path = await save_uploaded_image(back_file)

    # 3. Execute OCR extraction separately for front and back images
    front_ocr_result = None
    back_ocr_result = None
    analysis_status = "completed"

    try:
        front_ocr_result = extract_text_from_image(str(saved_front_path), source="front")
    except Exception as err:
        logger.error(f"Front image OCR error: {err}")
        analysis_status = "ocr_failed"

    if saved_back_path is not None:
        try:
            back_ocr_result = extract_text_from_image(str(saved_back_path), source="back")
        except Exception as err:
            logger.error(f"Back image OCR error: {err}")
            # If front succeeded, don't fail entire analysis if only back OCR errored
            if analysis_status == "ocr_failed":
                analysis_status = "ocr_failed"

    # 4. Consolidate OCR text: deduplicate repetitions and retain line sources
    consolidated = consolidate_ocr_results(front_ocr_result, back_ocr_result)
    extracted_text = consolidated["extracted_text"]

    ocr_lines: list[OCRLineResponse] = [
        OCRLineResponse(
            text=line["text"],
            confidence=float(line["confidence"]),
            source=line.get("source"),
        )
        for line in consolidated["lines"]
    ]

    # 5. Optional Reference Matching against local PostgreSQL records
    matched_record = None
    match_status = "needs_review"
    match_reason = "Manual review is required."

    if extracted_text.strip():
        try:
            match_result = find_medicine_reference(
                extracted_text=extracted_text,
                db=db,
            )
            matched_record = match_result.get("medicine")
            match_status = match_result.get("match_status", "needs_review")
            match_reason = match_result.get("match_reason", "Manual review is required.")
        except Exception:
            logger.exception("Medicine reference matching failed")
            match_status = "needs_review"
            match_reason = "Reference matching could not be completed."

    # 6. Generate AI Explanation using MedGemma vision + OCR text
    ai_explanation = None

    # Collect saved image paths so MedGemma can examine the actual packaging
    image_paths: list[str] = [str(saved_front_path)]
    if saved_back_path is not None:
        image_paths.append(str(saved_back_path))

    if extracted_text.strip() or image_paths:
        try:
            ai_explanation = explain_medicine_from_images(
                image_paths=image_paths,
                extracted_text=extracted_text,
            )
        except Exception as err:
            logger.error(f"AI explanation error: {err}")
            if analysis_status == "completed":
                analysis_status = "ai_failed"
    else:
        if analysis_status == "completed":
            analysis_status = "no_text_found"

    # 7. Construct medicine response: Use DB record if matched, or AI package candidate
    identity_verified = False  # Text matching or AI identification alone never proves physical authenticity
    medicine_response: MatchedMedicineResponse | None = None
    source_responses: list[SourceResponse] = []

    if matched_record is not None:
        medicine_response = MatchedMedicineResponse.model_validate(matched_record)
        source_responses = [
            SourceResponse.model_validate(source)
            for source in matched_record.sources
        ]
    elif extracted_text.strip() and ai_explanation:
        # Medicine is absent from fixed database: identify candidate from package evidence
        candidate_meta = parse_candidate_metadata(ai_explanation, extracted_text)
        candidate_brand = candidate_meta.get("brand_name")
        candidate_generic = candidate_meta.get("generic_name")
        candidate_strength = candidate_meta.get("strength")

        if candidate_brand or candidate_generic:
            candidate_title = candidate_brand or candidate_generic or "Unverified Package"
            if candidate_brand and candidate_strength:
                candidate_title = f"{candidate_brand} ({candidate_strength})"

            active_ings = [
                ActiveIngredientResponse(
                    id=uuid.UUID(ing["id"]) if isinstance(ing["id"], str) else ing["id"],
                    name=ing["name"],
                    strength=ing.get("strength"),
                )
                for ing in candidate_meta.get("active_ingredients", [])
            ]

            medicine_response = MatchedMedicineResponse(
                id=uuid.uuid4(),
                name=candidate_title,
                brand_name=candidate_brand,
                generic_name=candidate_generic,
                strength=candidate_strength,
                dosage_form=candidate_meta.get("dosage_form"),
                manufacturer=candidate_meta.get("manufacturer"),
                status="ai_suggestion",
                simple_explanation=candidate_meta.get("simple_explanation"),
                uses=candidate_meta.get("uses") or [],
                how_it_works=candidate_meta.get("how_it_works"),
                side_effects=candidate_meta.get("side_effects") or [],
                warnings=candidate_meta.get("warnings") or [],
                storage=candidate_meta.get("storage"),
                label_dosage=candidate_meta.get("label_dosage"),
                active_ingredients=active_ings,
                sources=[],  # Unverified live retrieval: no fabricated sources
            )
            match_status = "candidate_identified"
            match_reason = "Identified candidate from package text evidence (unlisted in local reference database)."
        else:
            match_status = "not_detected"
            match_reason = "No database reference record or package identity candidate could be identified."

    # 8. Persist scan metadata and the complete analysis
    ocr_lines_json = [
        {"text": line.text, "confidence": line.confidence, "source": line.source}
        for line in ocr_lines
    ]
    scan_record = Scan(
        user_id=current_user.id,
        medicine_id=matched_record.id if matched_record else None,
        status="ai_suggestion" if match_status == "candidate_identified" else "needs_review",
        image_url=f"/uploads/{saved_front_path.name}",
        demo=demo,
        extracted_text=extracted_text,
        ocr_lines=ocr_lines_json,
        ai_explanation=ai_explanation,
        match_status=match_status,
        match_reason=match_reason,
        identity_verified=False,
    )

    try:
        db.add(scan_record)
        db.commit()
        db.refresh(scan_record)
    except Exception:
        db.rollback()
        raise

    return AnalyzeResponse(
        scan=ScanResponse.model_validate(scan_record),
        extracted_text=extracted_text,
        ocr_lines=ocr_lines,
        ai_explanation=ai_explanation,
        analysis_status=analysis_status,
        medicine_match=MedicineMatchResponse(
            match_status=match_status,
            match_reason=match_reason,
            identity_verified=identity_verified,
            medicine=medicine_response,
        ),
        matched_medicine=medicine_response,
        sources=source_responses,
    )

