import unittest
from pathlib import Path
from backend.ai.ocr_service import extract_text_from_image, PROJECT_ROOT

class TestOCRBridgeAutomated(unittest.TestCase):
    def test_sample_label_extraction(self):
        sample_path = PROJECT_ROOT / "sample_medicine_label.png"
        self.assertTrue(sample_path.exists(), "sample_medicine_label.png should exist at project root")
        
        result = extract_text_from_image(str(sample_path))
        self.assertIn("extracted_text", result)
        self.assertIn("lines", result)
        self.assertIsInstance(result["lines"], list)
        
        # Verify lines have text and confidence
        if result["lines"]:
            first_line = result["lines"][0]
            self.assertIn("text", first_line)
            self.assertIn("confidence", first_line)
            self.assertGreaterEqual(float(first_line["confidence"]), 0.0)

if __name__ == '__main__':
    unittest.main()
