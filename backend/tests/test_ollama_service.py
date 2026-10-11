from backend.ai.ollama_service import explain_medicine_information

if __name__ == "__main__":
    result = explain_medicine_information(
        medicine_name="Paracetamol",
        extracted_text=(
            "Paracetamol 500 mg tablets. "
            "Example test text only; not a verified product label."
        ),
    )

    print("\nMedGemma response:\n")
    print(result)
