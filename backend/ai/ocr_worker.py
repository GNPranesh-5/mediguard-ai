import json
import sys
from pathlib import Path

import cv2
import numpy as np
from paddleocr import PaddleOCR


def preprocess_image(image_path: str):
    """Load and optimize medicine package image for OCR."""
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    h, w = img.shape[:2]

    # 1. Resize if image is too small or excessively large
    min_dim = min(h, w)
    max_dim = max(h, w)
    if min_dim < 600:
        scale = 600.0 / float(min_dim)
        img = cv2.resize(
            img,
            (int(w * scale), int(h * scale)),
            interpolation=cv2.INTER_CUBIC,
        )
    elif max_dim > 2500:
        scale = 2500.0 / float(max_dim)
        img = cv2.resize(
            img,
            (int(w * scale), int(h * scale)),
            interpolation=cv2.INTER_AREA,
        )

    # 2. Contrast enhancement for low-contrast foil / glare
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if gray.std() < 40:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        img = cv2.cvtColor(cv2.merge((l_enhanced, a, b)), cv2.COLOR_LAB2BGR)

    return img


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Expected one image path argument"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not Path(image_path).is_file():
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    try:
        processed_input = preprocess_image(image_path)

        ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        results = ocr.ocr(processed_input, cls=True)

        lines = []
        if results:
            for page in results:
                if not page:
                    continue
                # Sort items by vertical position first (line bucket), then horizontal
                def get_sort_key(item):
                    box = item[0]
                    y_top = min(pt[1] for pt in box)
                    x_left = min(pt[0] for pt in box)
                    # Bucket lines every 25 pixels to align horizontally adjacent words
                    return (int(y_top // 25), x_left)

                sorted_items = sorted(page, key=get_sort_key)
                for item in sorted_items:
                    text, confidence = item[1]
                    clean_text = str(text).strip()
                    if clean_text:
                        lines.append({
                            "text": clean_text,
                            "confidence": round(float(confidence), 4),
                        })

        print(json.dumps({
            "extracted_text": "\n".join(item["text"] for item in lines),
            "lines": lines,
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
