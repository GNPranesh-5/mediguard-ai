if __name__ == "__main__":
    from paddleocr import PaddleOCR

    ocr = PaddleOCR(use_angle_cls=True, lang="en")

    image_path = input("Enter the medicine image path: ").strip().strip('"')
    results = ocr.ocr(image_path, cls=True)

    print("\n--- Extracted Text ---")
    if results:
        for line in results:
            if line:
                for item in line:
                    text, confidence = item[1]
                    print(f"{text} (confidence: {confidence:.2f})")
