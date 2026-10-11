from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "717b146f-80f4-43a6-8ccc-a973b4906258"
NEW_URL = (
    "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm"
    "?setid=3bf1718a-fedc-4834-831e-b3b044f80ee6"
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
                if "dailymed.nlm.nih.gov" in source.url.lower()
            ),
            None,
        )

        if target is None:
            print("Existing DailyMed source not found. No changes made.")
            return

        print(f"Medicine: {medicine.name}")
        print(f"Old Source Name: {target.name}")
        print(f"Old URL: {target.url}")
        print(f"New URL: {NEW_URL}")

        target.url = NEW_URL
        target.name = "DailyMed — Amoxicillin Capsule Label"
        db.commit()
        print("Successfully updated Amoxicillin source URL in database.")


if __name__ == "__main__":
    main()
