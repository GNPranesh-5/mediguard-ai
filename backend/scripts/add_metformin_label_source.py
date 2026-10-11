from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "14fdf88b-460d-4424-aac8-9e7a3c0db398"
SOURCE_NAME = (
    "DailyMed — Metformin hydrochloride extended-release tablet label"
)
SOURCE_URL = (
    "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm"
    "?setid=cc070735-5e8d-4bb3-9caa-e84d29bb8943"
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
            print("Source already exists. No changes made.")
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
        print("Successfully added new DailyMed source to Metformin record.")


if __name__ == "__main__":
    main()
