from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.database import SessionLocal
from backend.models import Medicine


def main():
    with SessionLocal() as db:
        stmt = (
            select(Medicine)
            .options(
                selectinload(Medicine.active_ingredients),
                selectinload(Medicine.sources),
            )
            .order_by(Medicine.name)
        )
        medicines = db.scalars(stmt).all()

        print(f"Total medicine records: {len(medicines)}")
        print("=" * 65)

        for medicine in medicines:
            print(f"\nMedicine: {medicine.name}")
            print(f"ID: {medicine.id}")
            print(f"Brand: {medicine.brand_name or 'Not provided'}")
            print(f"Generic: {medicine.generic_name or 'Not provided'}")
            print(f"Strength: {medicine.strength or 'Not provided'}")
            print(f"Dosage form: {medicine.dosage_form or 'Not provided'}")
            print(f"Manufacturer: {medicine.manufacturer or 'Not provided'}")
            print(f"Record status: {medicine.status}")

            print("Active ingredients:")
            if medicine.active_ingredients:
                for ing in medicine.active_ingredients:
                    print(f"  - {ing.name} ({ing.strength or 'No strength'})")
            else:
                print("  - None specified")

            print("Sources:")
            if medicine.sources:
                for src in medicine.sources:
                    print(f"  - [{src.name}] {src.url}")
            else:
                print("  - None specified")


if __name__ == "__main__":
    main()
