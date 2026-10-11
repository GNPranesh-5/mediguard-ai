from backend.ai.medicine_matcher import find_medicine_reference
from backend.database import SessionLocal
from backend.models import Medicine


def run_regression_tests():
    test_cases = [
        # 1. Exact matches (Name + Matching Strength) -> candidate match (matched)
        ("Paracetamol 500 mg", "Paracetamol 500mg Tablets", "matched"),
        ("Ibuprofen 400mg", "Ibuprofen 400mg Film-coated Tablets", "matched"),
        ("Amoxicillin 500 mg", "Amoxicillin 500mg Capsules", "matched"),
        ("Metformin 500mg", "Metformin Hydrochloride 500mg Extended-Release", "matched"),
        ("Tylenol 500mg", "Paracetamol 500mg Tablets", "matched"),
        ("Advil 400mg", "Ibuprofen 400mg Film-coated Tablets", "matched"),

        # 2. Conflicting strengths -> needs_review (conflicting strength detected)
        ("Paracetamol 250 mg", None, "needs_review"),
        ("Ibuprofen 200mg", None, "needs_review"),

        # 3. Candidate matches (Name matched, but no strength specified in OCR) -> candidate_matched
        ("Paracetamol", "Paracetamol 500mg Tablets", "candidate_matched"),
        ("Ibuprofen", "Ibuprofen 400mg Film-coated Tablets", "candidate_matched"),

        # 4. Non-distinguishing / False-positive prevention -> not_detected
        ("Hydrochloride 500mg", None, "not_detected"),
        ("Sodium Extended-Release Tablets", None, "not_detected"),
        ("UnknownMedication 250mg", None, "not_detected"),
    ]

    with SessionLocal() as db:
        print("=== STRENGTHENED REGRESSION TEST SUITE ===")
        all_passed = True

        for ocr_text, expected_name, expected_status in test_cases:
            res = find_medicine_reference(ocr_text, db)
            actual_status = res["match_status"]
            actual_name = res["medicine"].name if res["medicine"] else None

            status_ok = actual_status == expected_status
            name_ok = actual_name == expected_name

            passed = status_ok and name_ok
            if not passed:
                all_passed = False
                print(f"[FAIL] Input='{ocr_text}'")
                print(f"   Expected: status={expected_status}, name={expected_name}")
                print(f"   Actual:   status={actual_status}, name={actual_name}")
                print(f"   Reason:   {res['match_reason']}")
            else:
                print(f"[PASS] Input='{ocr_text}' -> Status={actual_status}, Candidate={actual_name}")

        # 5. Ambiguity Test: Add a temporary duplicate medicine record
        print("\n--- Testing Ambiguous Match Handling ---")
        temp_med = Medicine(
            name="Paracetamol 250mg Oral Solution",
            generic_name="Paracetamol",
            strength="250mg",
            status="needs_review"
        )
        db.add(temp_med)
        db.flush()

        ambiguous_res = find_medicine_reference("Paracetamol", db)
        db.rollback()  # Rollback temporary record

        if ambiguous_res["match_status"] == "needs_review" and ambiguous_res["medicine"] is None:
            print("[PASS] Ambiguous search ('Paracetamol' matching multiple DB records) -> Status=needs_review, Candidate=None")
        else:
            all_passed = False
            print(f"[FAIL] Ambiguous search failed: Status={ambiguous_res['match_status']}, Candidate={ambiguous_res['medicine']}")

        print("==========================================")
        if all_passed:
            print("ALL STRENGTHENED REGRESSION TESTS PASSED CLEANLY!")
        else:
            print("SOME TESTS FAILED!")

        return all_passed


def test_matcher_regression():
    assert run_regression_tests() is True


if __name__ == "__main__":
    success = run_regression_tests()
    if not success:
        exit(1)
