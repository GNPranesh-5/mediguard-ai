from backend.database import SessionLocal, engine
from backend.models import ActiveIngredient, Base, Medicine, Source
from sqlalchemy import select


def seed_medicines():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_count = db.scalar(select(Medicine))
        if existing_count:
            print("Medicine records already exist. Skipping seed.")
            return

        sample_medicines = [
            {
                "name": "Paracetamol 500mg Tablets",
                "brand_name": "Tylenol / Panadol",
                "generic_name": "Paracetamol (Acetaminophen)",
                "strength": "500mg",
                "dosage_form": "Tablet",
                "manufacturer": "GlaxoSmithKline",
                "uses": ["Fever reduction", "Mild to moderate pain relief", "Headache", "Muscle ache"],
                "how_it_works": "Paracetamol inhibits cyclooxygenase (COX) enzymes in the central nervous system, reducing prostaglandin synthesis involved in pain and fever generation.",
                "side_effects": ["Nausea", "Allergic skin rash (rare)", "Liver toxicity (in overdose)"],
                "warnings": ["Do not exceed 4,000mg per 24 hours.", "Avoid alcohol while taking this medicine to prevent liver damage."],
                "contraindications": ["Severe liver dysfunction", "Known hypersensitivity to paracetamol"],
                "storage": "Store below 25°C in a dry place away from direct sunlight.",
                "label_dosage": "Adults: 1-2 tablets every 4-6 hours as needed. Maximum 8 tablets in 24 hours.",
                "simple_explanation": "A common pain reliever and fever reducer used for headaches, muscle aches, and colds.",
                "status": "needs_review",
                "active_ingredients": [
                    {"name": "Paracetamol", "strength": "500mg"}
                ],
                "sources": [
                    {"name": "PubChem Acetaminophen Compound Summary", "url": "https://pubchem.ncbi.nlm.nih.gov/compound/Acetaminophen"},
                    {"name": "FDA Drug Label - Paracetamol", "url": "https://accessdata.fda.gov"}
                ],
            },
            {
                "name": "Ibuprofen 400mg Film-coated Tablets",
                "brand_name": "Advil / Nurofen",
                "generic_name": "Ibuprofen",
                "strength": "400mg",
                "dosage_form": "Tablet",
                "manufacturer": "Pfizer",
                "uses": ["Inflammation relief", "Joint pain", "Dental pain", "Menstrual cramps"],
                "how_it_works": "Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID) that inhibits COX-1 and COX-2 enzymes, decreasing inflammatory prostaglandin production.",
                "side_effects": ["Stomach upset", "Heartburn", "Dizziness", "Increased risk of gastrointestinal bleeding"],
                "warnings": ["Take with food or milk to reduce stomach irritation.", "Use caution if you have a history of asthma or kidney disease."],
                "contraindications": ["Active peptic ulcer disease", "Severe heart failure", "Third trimester of pregnancy"],
                "storage": "Store room temperature 15-30°C.",
                "label_dosage": "Adults: 1 tablet every 6-8 hours with meals as needed. Maximum 1,200mg/day OTC.",
                "simple_explanation": "An anti-inflammatory medicine used to reduce swelling, joint pain, toothaches, and fever.",
                "status": "needs_review",
                "active_ingredients": [
                    {"name": "Ibuprofen", "strength": "400mg"}
                ],
                "sources": [
                    {"name": "PubChem Ibuprofen Summary", "url": "https://pubchem.ncbi.nlm.nih.gov/compound/Ibuprofen"}
                ],
            },
            {
                "name": "Amoxicillin 500mg Capsules",
                "brand_name": "Amoxil",
                "generic_name": "Amoxicillin",
                "strength": "500mg",
                "dosage_form": "Capsule",
                "manufacturer": "Teva Pharmaceuticals",
                "uses": ["Bacterial chest infections", "Ear infections", "Urinary tract infections", "Dental infections"],
                "how_it_works": "Amoxicillin is a beta-lactam antibiotic that interferes with bacterial cell wall peptidoglycan synthesis, causing cell lysis.",
                "side_effects": ["Diarrhea", "Nausea", "Skin rash", "Vaginal yeast infection"],
                "warnings": ["Finish the entire prescribed course even if symptoms resolve early.", "Report severe watery diarrhea immediately."],
                "contraindications": ["Known penicillin allergy", "Infectious mononucleosis"],
                "storage": "Store below 25°C in a tight container.",
                "label_dosage": "Adults: 1 capsule every 8 hours as prescribed by physician.",
                "simple_explanation": "A penicillin-type antibiotic prescribed by doctors to treat bacterial infections.",
                "status": "needs_review",
                "active_ingredients": [
                    {"name": "Amoxicillin Trihydrate", "strength": "500mg"}
                ],
                "sources": [
                    {"name": "DailyMed Amoxicillin Label", "url": "https://dailymed.nlm.nih.gov"}
                ],
            },
            {
                "name": "Metformin Hydrochloride 500mg Extended-Release",
                "brand_name": "Glucophage XR",
                "generic_name": "Metformin",
                "strength": "500mg",
                "dosage_form": "Extended-Release Tablet",
                "manufacturer": "Merck",
                "uses": ["Type 2 Diabetes Mellitus management", "Blood sugar control"],
                "how_it_works": "Metformin decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity.",
                "side_effects": ["Abdominal discomfort", "Diarrhea", "Metallic taste", "Vitamin B12 deficiency with long-term use"],
                "warnings": ["Rare risk of lactic acidosis. Seek urgent care if experiencing muscle pain or hyperventilation.", "Discontinue prior to contrast dye imaging."],
                "contraindications": ["Severe renal impairment (eGFR < 30 mL/min)", "Acute metabolic acidosis"],
                "storage": "Store between 20°C and 25°C.",
                "label_dosage": "Adults: 1 tablet daily with evening meal, titrated as directed by physician.",
                "simple_explanation": "A first-line medication for managing blood sugar levels in type 2 diabetes.",
                "status": "needs_review",
                "active_ingredients": [
                    {"name": "Metformin Hydrochloride", "strength": "500mg"}
                ],
                "sources": [
                    {"name": "NIH Metformin Information", "url": "https://medlineplus.gov/druginfo/meds/a696005.html"}
                ],
            },
        ]

        for med_data in sample_medicines:
            active_ing_data = med_data.pop("active_ingredients")
            sources_data = med_data.pop("sources")

            med = Medicine(**med_data)
            db.add(med)
            db.flush()

            for ing in active_ing_data:
                db.add(ActiveIngredient(medicine_id=med.id, **ing))
            for src in sources_data:
                db.add(Source(medicine_id=med.id, **src))

        db.commit()
        print(f"Successfully seeded {len(sample_medicines)} medicine records into database.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_medicines()
