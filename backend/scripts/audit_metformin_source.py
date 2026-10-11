from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "14fdf88b-460d-4424-aac8-9e7a3c0db398"


def main():
    with SessionLocal() as db:
        medicine = db.get(Medicine, MEDICINE_ID)
        if medicine is None:
            print("Medicine record not found.")
            return

        print("Medicine:", medicine.name)
        print("Brand:", medicine.brand_name)
        print("Generic:", medicine.generic_name)
        print("Manufacturer:", medicine.manufacturer)
        print("Strength:", medicine.strength)
        print("Dosage form:", medicine.dosage_form)
        print("Status:", medicine.status)

        print("\nActive ingredients:")
        for ingredient in medicine.active_ingredients:
            print(
                f"- {ingredient.name} "
                f"| Strength: {ingredient.strength or 'Not provided'}"
            )

        sources = db.scalars(
            select(Source).where(Source.medicine_id == medicine.id)
        ).all()

        print("\nSources:")
        for source in sources:
            print(f"Name: {source.name}")
            print(f"URL: {source.url}")


if __name__ == "__main__":
    main()
