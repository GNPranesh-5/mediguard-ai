from backend.ai.ocr_service import extract_text_from_image

if __name__ == "__main__":
    image_path = input("Enter the medicine image path: ").strip().strip('"')
    result = extract_text_from_image(image_path)

    print("\n--- OCR Bridge Result ---")
    print("Extracted text:")
    print(result["extracted_text"])
    print("\nDetected lines:")
    for line in result["lines"]:
        print(f'{line["text"]} (confidence: {line["confidence"]:.2f})')
