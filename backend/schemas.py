from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


class ActiveIngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    strength: str | None = None


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    url: str


class MedicineSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    brand_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    status: str


class SavedMedicinesResponse(BaseModel):
    medicines: list[MedicineSummaryResponse] = Field(default_factory=list)


class MedicineSearchResponse(BaseModel):
    results: list[MedicineSummaryResponse] = Field(default_factory=list)


class MedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    brand_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    uses: list = []
    how_it_works: str | None = None
    side_effects: list = []
    warnings: list = []
    contraindications: list = []
    storage: str | None = None
    label_dosage: str | None = None
    simple_explanation: str | None = None
    extracted_text: str | None = None
    status: str
    active_ingredients: list[ActiveIngredientResponse] = Field(default_factory=list)
    sources: list[SourceResponse] = Field(default_factory=list)


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    medicine_id: UUID | None = None
    scanned_at: datetime
    status: str
    image_url: str | None = None
    demo: bool


class ScanHistoryItem(BaseModel):
    id: UUID
    medicine_id: UUID | None = None
    scanned_at: datetime
    status: str
    image_url: str | None = None
    demo: bool
    medicine_name: str | None = None


class ScanHistoryResponse(BaseModel):
    scans: list[ScanHistoryItem] = Field(default_factory=list)


class OCRLineResponse(BaseModel):
    text: str
    confidence: float
    source: str | None = None


class MatchedMedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    brand_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    manufacturer: str | None = None
    status: str
    simple_explanation: str | None = None
    uses: list = Field(default_factory=list)
    how_it_works: str | None = None
    side_effects: list = Field(default_factory=list)
    warnings: list = Field(default_factory=list)
    contraindications: list = Field(default_factory=list)
    storage: str | None = None
    label_dosage: str | None = None
    active_ingredients: list[ActiveIngredientResponse] = Field(default_factory=list)
    sources: list[SourceResponse] = Field(default_factory=list)


class MedicineMatchResponse(BaseModel):
    match_status: str
    match_reason: str
    identity_verified: bool = False
    medicine: MatchedMedicineResponse | None = None


class AnalyzeResponse(BaseModel):
    scan: ScanResponse
    extracted_text: str
    ocr_lines: list[OCRLineResponse]
    ai_explanation: str | None = None
    analysis_status: str
    medicine_match: MedicineMatchResponse | None = None
    matched_medicine: MatchedMedicineResponse | None = None
    sources: list[SourceResponse] = Field(default_factory=list)
