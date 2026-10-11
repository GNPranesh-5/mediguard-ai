from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.database import SessionLocal
from backend.models import Medicine, Source

MEDICINE_ID = "5d4f9ff4-3fd3-4d5e-9249-205f20663942"


def main():
    with SessionLocal() as db:
        medicine = db.scalar(
            select(Medicine)
            .options(
                selectinload(Medicine.active_ingredients),
                selectinload(Medicine.sources),
            )
            .where(Medicine.id == MEDICINE_ID)
        )
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

        print("\nSources:")
        for source in medicine.sources:
            print(f"Name: {source.name}")
            print(f"URL: {source.url}")


if __name__ == "__main__":
    main()
