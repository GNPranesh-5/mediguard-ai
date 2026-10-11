from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "5d4f9ff4-3fd3-4d5e-9249-205f20663942"
NEW_NAME = "DailyMed — Tylenol Extra Strength 500 mg label"
NEW_URL = (
    "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm"
    "?setid=103d109d-f520-409c-8da2-eb6b0fbec891"
)


def main():
    with SessionLocal() as db:
        medicine = db.get(Medicine, MEDICINE_ID)
        if medicine is None:
            print("Medicine record not found. No changes made.")
            return

        sources = db.scalars(
            select(Source).where(Source.medicine_id == medicine.id)
        ).all()

        target = next(
            (
                source for source in sources
                if "accessdata.fda.gov" in source.url.lower()
            ),
            None,
        )

        if target is None:
            print("Existing FDA source not found. No changes made.")
            return

        print(f"Medicine: {medicine.name}")
        print(f"Old Source Name: {target.name}")
        print(f"Old URL: {target.url}")
        print(f"New Source Name: {NEW_NAME}")
        print(f"New URL: {NEW_URL}")

        target.name = NEW_NAME
        target.url = NEW_URL
        db.commit()
        print("Successfully updated Paracetamol source URL in database.")


if __name__ == "__main__":
    main()
