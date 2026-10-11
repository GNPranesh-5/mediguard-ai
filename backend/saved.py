import logging
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.dependencies import get_current_user, get_db
from backend.models import ActiveIngredient, Medicine, SavedMedicine, User
from backend.schemas import MedicineSummaryResponse, SavedMedicinesResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/saved", tags=["Saved Medicines"])


@router.get("", response_model=SavedMedicinesResponse)
def get_user_saved_medicines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all saved medicines for the authenticated user."""
    stmt = (
        select(SavedMedicine)
        .options(selectinload(SavedMedicine.medicine))
        .where(SavedMedicine.user_id == current_user.id)
    )
    saved_entries = db.scalars(stmt).all()
    medicines = [
        MedicineSummaryResponse.model_validate(entry.medicine)
        for entry in saved_entries
        if entry.medicine
    ]
    return SavedMedicinesResponse(medicines=medicines)


@router.put("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def save_medicine(
    medicine_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a medicine to the user's bookmarks."""
    medicine = db.get(Medicine, medicine_id)
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found.",
        )

    # Check if already saved
    stmt = select(SavedMedicine).where(
        SavedMedicine.user_id == current_user.id,
        SavedMedicine.medicine_id == medicine_id,
    )
    existing = db.scalar(stmt)
    if not existing:
        new_saved = SavedMedicine(
            user_id=current_user.id,
            medicine_id=medicine_id,
        )
        db.add(new_saved)
        db.commit()

    return None


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_medicine(
    medicine_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a medicine from the user's bookmarks."""
    stmt = select(SavedMedicine).where(
        SavedMedicine.user_id == current_user.id,
        SavedMedicine.medicine_id == medicine_id,
    )
    existing = db.scalar(stmt)
    if existing:
        db.delete(existing)
        db.commit()

    return None

from pydantic import BaseModel, ConfigDict


class AIMedicinePayload(BaseModel):
    """Minimal shape of an AI-generated medicine object sent from the frontend."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    name: str
    brand_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    simple_explanation: str | None = None
    uses: list[Any] = []
    how_it_works: str | None = None
    side_effects: list[Any] = []
    warnings: list[Any] = []
    storage: str | None = None
    label_dosage: str | None = None
    active_ingredients: list[Any] = []
    ai_explanation: str | None = None


@router.post("/ai", status_code=status.HTTP_201_CREATED)
def save_ai_medicine(
    payload: AIMedicinePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persist an AI-generated medicine result to the medicines table, then save it
    for the current user. Returns the new medicine id for subsequent unsave calls.
    """
    # Create the Medicine row
    new_medicine = Medicine(
        id=uuid4(),
        name=payload.name,
        brand_name=payload.brand_name,
        generic_name=payload.generic_name,
        strength=payload.strength,
        dosage_form=payload.dosage_form,
        manufacturer=payload.manufacturer,
        simple_explanation=payload.simple_explanation,
        uses=payload.uses,
        how_it_works=payload.how_it_works,
        side_effects=payload.side_effects,
        warnings=payload.warnings,
        storage=payload.storage,
        label_dosage=payload.label_dosage,
        extracted_text=payload.ai_explanation,
        status="needs_review",
    )
    db.add(new_medicine)
    db.flush()  # assign id before creating ingredients

    # Persist active ingredients if provided
    for ing in payload.active_ingredients:
        if isinstance(ing, dict) and ing.get("name"):
            db.add(ActiveIngredient(
                id=uuid4(),
                medicine_id=new_medicine.id,
                name=ing["name"],
                strength=ing.get("strength"),
            ))

    # Save to the user's bookmarks (ignore if already saved)
    existing = db.scalar(
        select(SavedMedicine).where(
            SavedMedicine.user_id == current_user.id,
            SavedMedicine.medicine_id == new_medicine.id,
        )
    )
    if not existing:
        db.add(SavedMedicine(user_id=current_user.id, medicine_id=new_medicine.id))

    db.commit()
    db.refresh(new_medicine)

    return {"id": str(new_medicine.id), "name": new_medicine.name}
