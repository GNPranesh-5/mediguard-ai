from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "a85ce510-8554-4065-b372-a781ed64ec4a"
SOURCE_NAME = "DailyMed — Ibuprofen 400 mg film-coated tablet label"
SOURCE_URL = (
    "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm"
    "?setid=d88d0544-57a7-4a82-e053-2a95a90a1945"
)


def main():
    with SessionLocal() as db:
        medicine = db.get(Medicine, MEDICINE_ID)
        if medicine is None:
            print("Medicine record not found. No changes made.")
            return

        existing = db.scalars(
            select(Source).where(
                Source.medicine_id == medicine.id,
                Source.url == SOURCE_URL,
            )
        ).first()

        if existing:
            print("This source URL is already attached. No changes made.")
            return

        print("Medicine:", medicine.name)
        print("Existing status:", medicine.status)
        print(f"Adding new source: [{SOURCE_NAME}] {SOURCE_URL}")

        new_source = Source(
            medicine_id=medicine.id,
            name=SOURCE_NAME,
            url=SOURCE_URL,
        )
        db.add(new_source)
        db.commit()
        print("Successfully added new DailyMed source to Ibuprofen record.")


if __name__ == "__main__":
    main()
