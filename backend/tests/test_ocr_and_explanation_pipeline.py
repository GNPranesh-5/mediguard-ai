import re
import unittest
from pathlib import Path

from backend.ai.ocr_service import (
    consolidate_ocr_results,
    deduplicate_lines,
    extract_text_from_image,
)
from backend.ai.ollama_service import (
    clean_model_output,
    explain_medicine_information,
    parse_candidate_metadata,
)

TEST_DIR = Path(__file__).resolve().parent
PAN_D_FRONT = TEST_DIR / "pan_d_front.jpg"
PAN_D_BACK = TEST_DIR / "pan_d_back.jpg"


class TestOCRandAIExplanationPipeline(unittest.TestCase):
    def test_clean_model_output_removes_internal_thoughts_and_unused_tokens(self):
        raw_output = (
            "<unused94>thought\n"
            "The user wants me to analyze PAN-D blister pack.\n"
            "Ingredients are pantoprazole and domperidone.\n"
            "<unused95>### 1. Likely Medicine Identification\n"
            "- **Brand Name:** PAN-D\n"
            "- **Generic Name / Active Ingredients:** Pantoprazole 40 mg + Domperidone 30 mg\n"
            "<unused42>"
        )
        cleaned = clean_model_output(raw_output)

        # 1. Must never contain raw model tokens
        self.assertNotIn("<unused94>", cleaned)
        self.assertNotIn("<unused95>", cleaned)
        self.assertNotIn("<unused42>", cleaned)
        self.assertNotIn("thought\nThe user wants me to", cleaned)

        # 2. Must retain the clean structured content
        self.assertIn("### 1. Likely Medicine Identification", cleaned)
        self.assertIn("Brand Name:** PAN-D", cleaned)

    def test_ocr_deduplication_eliminates_foil_fragments_and_repetitions(self):
        sample_front_lines = [
            {"text": "ALKEM", "confidence": 0.8435},
            {"text": "ALKEM", "confidence": 0.9951},
            {"text": "-D", "confidence": 0.5782},
            {"text": "PAN-D", "confidence": 0.9542},
            {"text": "PAN-DE", "confidence": 0.8374},
            {"text": "ALKEM", "confidence": 0.9099},
            {"text": "ALKEM", "confidence": 0.9385},
            {"text": "AN-D", "confidence": 0.9715},
            {"text": "PAN-D", "confidence": 0.9853},
            {"text": "PAN-D", "confidence": 0.9865},
            {"text": "MALXEMALKEMALKE", "confidence": 0.874},
            {"text": "WALKEMAUKEMALKEM ALKEMALKCMALKEMARKE", "confidence": 0.9073},
            {"text": "PAN-TD", "confidence": 0.8019},
        ]

        cleaned = deduplicate_lines(sample_front_lines)

        # Verify key brands are retained cleanly
        self.assertIn("PAN-D", cleaned)
        self.assertIn("ALKEM", cleaned)

        # Verify repetitive fragments and security foil stamps are filtered out
        self.assertNotIn("-D", cleaned)
        self.assertNotIn("PAN-DE", cleaned)
        self.assertNotIn("PAN-TD", cleaned)
        self.assertNotIn("MALXEMALKEMALKE", cleaned)
        self.assertNotIn("WALKEMAUKEMALKEM ALKEMALKCMALKEMARKE", cleaned)

        # Verify no repeated duplicates in clean list
        self.assertEqual(cleaned.count("PAN-D"), 1)
        self.assertEqual(cleaned.count("ALKEM"), 1)

    def test_ocr_extraction_on_pan_d_images_retains_ingredients_and_strengths(self):
        if not PAN_D_BACK.exists():
            self.skipTest(f"Test image {PAN_D_BACK} not found.")

        back_ocr = extract_text_from_image(str(PAN_D_BACK), source="back")
        self.assertIn("lines", back_ocr)
        self.assertTrue(len(back_ocr["lines"]) > 0)

        # All lines from back must be tagged with source="back"
        for line in back_ocr["lines"]:
            self.assertEqual(line.get("source"), "back")

        # Verify ingredients and strengths extracted from physical label
        full_back_text = " ".join(line["text"] for line in back_ocr["lines"]).lower()
        self.assertIn("pantoprazole", full_back_text)
        self.assertIn("40 mg", full_back_text)
        self.assertIn("domperidone", full_back_text)
        self.assertIn("30 mg", full_back_text)
        self.assertIn("schedule h", full_back_text)

    def test_multi_image_consolidation(self):
        front_res = {
            "extracted_text": "ALKEM\nPAN-D",
            "lines": [
                {"text": "ALKEM", "confidence": 0.99, "source": "front"},
                {"text": "PAN-D", "confidence": 0.98, "source": "front"},
            ],
        }
        back_res = {
            "extracted_text": "Pantoprazole 40 mg\nDomperidone 30 mg",
            "lines": [
                {"text": "Pantoprazole 40 mg", "confidence": 0.97, "source": "back"},
                {"text": "Domperidone 30 mg", "confidence": 0.99, "source": "back"},
            ],
        }

        consolidated = consolidate_ocr_results(front_res, back_res)
        text = consolidated["extracted_text"]

        self.assertIn("[Front of package]", text)
        self.assertIn("PAN-D", text)
        self.assertIn("[Back of package]", text)
        self.assertIn("Pantoprazole 40 mg", text)

        # Check raw lines preserve sources for debugging
        sources = [l.get("source") for l in consolidated["lines"]]
        self.assertIn("front", sources)
        self.assertIn("back", sources)

    def test_candidate_metadata_parsing(self):
        sample_explanation = """### 1. Likely Medicine Identification
- **Brand Name:** PAN-D
- **Generic Name / Active Ingredients:** Pantoprazole Sodium 40 mg + Domperidone 30 mg
- **Dosage Form:** Gastro-resistant and Prolonged-release Capsules IP
- **Manufacturer:** Alkem Laboratories Ltd.
- **Evidence & Confidence:** High confidence based on package text.

### 2. Clinical Uses
- Treatment of gastroesophageal reflux disease (GERD).
- Management of dyspepsia and acid-related nausea.

### 3. How It Works (Mechanism of Action)
- Pantoprazole inhibits gastric proton pumps reducing stomach acid.
- Domperidone is a prokinetic dopamine antagonist improving stomach motility.

### 5. Common Side Effects
- Headache and dizziness.
- Diarrhea or abdominal discomfort.

### 6. Warnings & Precautions
- Schedule H prescription drug - caution required.
- Consult physician for cardiac conditions.

### 7. Package Evidence vs Unverified Information
- Directly extracted: Brand name PAN-D, active ingredients, manufacturer.
- Unverified clinical knowledge: mechanism and clinical uses from model memory.
- No live external database verification was performed.
"""
        meta = parse_candidate_metadata(
            sample_explanation,
            extracted_text="Pantoprazole Sodium 40 mg\nDomperidone 30 mg\nStorage: Store below 30 C",
        )

        self.assertEqual(meta["brand_name"], "PAN-D")
        self.assertIn("Pantoprazole", meta["generic_name"])
        self.assertIn("Capsules", meta["dosage_form"])
        self.assertIn("Alkem", meta["manufacturer"])
        self.assertTrue(len(meta["uses"]) > 0)
        self.assertTrue(len(meta["side_effects"]) > 0)
        self.assertTrue(len(meta["warnings"]) > 0)
        self.assertIn("Store below 30 C", meta["storage"])


if __name__ == "__main__":
    unittest.main()
