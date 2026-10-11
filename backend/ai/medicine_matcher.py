import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.models import Medicine

# Words that should not be used as standalone matching criteria
NON_DISTINGUISHING_WORDS = {
    # Generic salts & chemical forms
    "hydrochloride", "hcl", "sodium", "potassium", "calcium",
    "trihydrate", "hydrate", "maleate", "sulfate", "succinate",
    "acetate", "phosphate", "citrate", "tartrate", "mesylate",
    # Dosage forms & release mechanisms
    "tablet", "tablets", "capsule", "capsules", "cap", "tabs", "tab",
    "solution", "syrup", "suspension", "injection", "gel", "cream",
    "ointment", "extended", "release", "film", "coated", "xr", "er",
    "sr", "dr", "oral", "topical", "ophthalmic",
    # Common packaging words & units
    "mg", "g", "ml", "mcg", "dose", "daily", "take", "pack", "brand",
}


def normalize_text(value: str | None) -> str:
    """Normalize text for case-insensitive medicine matching."""
    if not value:
        return ""
    value = value.casefold()
    # Standardize number and unit spacing (e.g. '500 mg' -> '500mg')
    value = re.sub(r"(\d+)\s+(mg|g|ml|mcg)", r"\1\2", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def extract_distinguishing_tokens(text: str | None) -> set[str]:
    """Extract key distinguishing medicine name/ingredient tokens."""
    normalized = normalize_text(text)
    tokens = set()
    for token in normalized.split():
        clean_token = re.sub(r"\d+", "", token)
        if len(clean_token) >= 3 and clean_token not in NON_DISTINGUISHING_WORDS:
            tokens.add(clean_token)
    return tokens


def extract_strength_tokens(text: str | None) -> set[str]:
    """Extract numeric dosage strength patterns (e.g. '500mg', '250mg')."""
    if not text:
        return set()
    normalized = normalize_text(text)
    strengths = set(re.findall(r"\b\d+(?:mg|g|ml|mcg)\b", normalized))
    return strengths


def find_medicine_reference(
    extracted_text: str,
    db: Session,
) -> dict:
    """
    Search existing medicine records using OCR text.
    A match here is a candidate for review, not proof of identity.
    """
    normalized_ocr = normalize_text(extracted_text)
    if not normalized_ocr:
        return {
            "medicine": None,
            "match_status": "not_detected",
            "match_reason": "No readable text was extracted.",
        }

    ocr_distinguishing_tokens = extract_distinguishing_tokens(extracted_text)
    if not ocr_distinguishing_tokens:
        return {
            "medicine": None,
            "match_status": "not_detected",
            "match_reason": "No distinguishing medicine names or active ingredients found in text.",
        }

    ocr_strengths = extract_strength_tokens(extracted_text)

    all_medicines = db.scalars(
        select(Medicine).options(
            selectinload(Medicine.active_ingredients),
            selectinload(Medicine.sources),
        )
    ).all()

    candidates = []
    conflicting_strength_candidates = []

    for med in all_medicines:
        # Extract distinguishing tokens for name, brand name, generic name, active ingredients
        med_distinguishing_tokens = set()
        med_distinguishing_tokens.update(extract_distinguishing_tokens(med.name))
        med_distinguishing_tokens.update(extract_distinguishing_tokens(med.brand_name))
        med_distinguishing_tokens.update(extract_distinguishing_tokens(med.generic_name))
        for ing in med.active_ingredients:
            med_distinguishing_tokens.update(extract_distinguishing_tokens(ing.name))

        # Require overlap of at least one distinguishing token
        matching_tokens = med_distinguishing_tokens & ocr_distinguishing_tokens

        if matching_tokens:
            med_strengths = extract_strength_tokens(med.strength) or extract_strength_tokens(med.name)

            if ocr_strengths and med_strengths:
                if ocr_strengths & med_strengths:
                    candidates.append((med, "matched"))
                else:
                    # OCR detected a strength, but it CONFLICTS with the reference record's strength
                    conflicting_strength_candidates.append(med)
            elif not ocr_strengths:
                # OCR has no strength detected -> candidate match without strength verification
                candidates.append((med, "candidate_matched"))
            else:
                # Reference record has no strength specified
                candidates.append((med, "candidate_matched"))

    if not candidates:
        if conflicting_strength_candidates:
            return {
                "medicine": None,
                "match_status": "needs_review",
                "match_reason": f"Conflicting strength detected in text ({', '.join(ocr_strengths)}) vs reference record.",
            }
        return {
            "medicine": None,
            "match_status": "not_detected",
            "match_reason": "No database medicine reference matched the extracted text.",
        }

    if len(candidates) == 1:
        med, match_status = candidates[0]
        return {
            "medicine": med,
            "match_status": match_status,
            "match_reason": f"Matched reference record '{med.name}'.",
        }

    return {
        "medicine": None,
        "match_status": "needs_review",
        "match_reason": f"Ambiguous match: {len(candidates)} candidate medicine records matched.",
    }
