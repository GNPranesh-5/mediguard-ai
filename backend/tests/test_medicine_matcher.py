from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.medicine_matcher import find_medicine_reference
from backend.database import SessionLocal
from backend.models import Medicine


def main():
    with SessionLocal() as db:
        medicines = db.scalars(
            select(Medicine).order_by(Medicine.name).limit(20)
        ).all()

        print("Existing medicine records:")
        for medicine in medicines:
            print(
                f"- {medicine.name} | "
                f"strength={medicine.strength!r} | "
                f"status={medicine.status}"
            )

        extracted_text = input(
            "\nEnter OCR text to test: "
        ).strip()

        result = find_medicine_reference(extracted_text, db)

        print("\nMatch status:", result["match_status"])
        print("Reason:", result["match_reason"])

        medicine = result["medicine"]
        if medicine:
            print("Candidate:", medicine.name)


if __name__ == "__main__":
    main()
