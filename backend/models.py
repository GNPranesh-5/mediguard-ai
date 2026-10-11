
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


def new_id():
    return uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    scans: Mapped[list["Scan"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    saved_medicines: Mapped[list["SavedMedicine"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    brand_name: Mapped[str | None] = mapped_column(String(255))
    generic_name: Mapped[str | None] = mapped_column(String(255))
    strength: Mapped[str | None] = mapped_column(String(100))
    dosage_form: Mapped[str | None] = mapped_column(String(100))
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    uses: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    how_it_works: Mapped[str | None] = mapped_column(Text)
    side_effects: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    warnings: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    contraindications: Mapped[list] = mapped_column(
        JSONB, default=list, nullable=False
    )
    storage: Mapped[str | None] = mapped_column(Text)
    label_dosage: Mapped[str | None] = mapped_column(Text)
    simple_explanation: Mapped[str | None] = mapped_column(Text)
    extracted_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(30), default="needs_review", nullable=False
    )

    active_ingredients: Mapped[list["ActiveIngredient"]] = relationship(
        back_populates="medicine", cascade="all, delete-orphan"
    )
    sources: Mapped[list["Source"]] = relationship(
        back_populates="medicine", cascade="all, delete-orphan"
    )


class ActiveIngredient(Base):
    __tablename__ = "active_ingredients"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    medicine_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medicines.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    strength: Mapped[str | None] = mapped_column(String(100))

    medicine: Mapped["Medicine"] = relationship(
        back_populates="active_ingredients"
    )


class Source(Base):
    __tablename__ = "medicine_sources"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    medicine_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medicines.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)

    medicine: Mapped["Medicine"] = relationship(back_populates="sources")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medicine_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medicines.id", ondelete="SET NULL"),
        nullable=True,
    )
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text)
    demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_lines: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    match_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    identity_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="scans")
    medicine: Mapped["Medicine | None"] = relationship()


class SavedMedicine(Base):
    __tablename__ = "saved_medicines"
    __table_args__ = (
        UniqueConstraint("user_id", "medicine_id", name="uq_saved_user_medicine"),
    )

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_id
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medicine_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medicines.id", ondelete="CASCADE"),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="saved_medicines")
    medicine: Mapped["Medicine"] = relationship()


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(
        String(36), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

