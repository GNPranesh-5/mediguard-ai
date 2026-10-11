import base64
import logging
import re
import uuid
from pathlib import Path

import ollama

logger = logging.getLogger(__name__)

MODEL_NAME = "medgemma1.5:4b"


def clean_model_output(raw_content: str) -> str:
    """
    Remove internal reasoning tokens, scratchpad blocks, and special markers
    from MedGemma output before sending to frontend or database.
    """
    if not raw_content:
        return ""

    # 1. Strip MedGemma internal thought scratchpad: <unused94>thought ... <unused95>
    cleaned = re.sub(
        r"<unused94>\s*thought[\s\S]*?<unused95>",
        "",
        raw_content,
        flags=re.IGNORECASE,
    )

    # 2. Strip XML-style thinking tags if emitted
    cleaned = re.sub(
        r"<thought>[\s\S]*?</thought>",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    # 3. Strip any stray <unused\d+> tokens
    cleaned = re.sub(r"<unused\d+>", "", cleaned)

    # 4. Remove leading 'thought\n' marker if tags were partly separated
    cleaned = re.sub(r"^thought\s*\n+", "", cleaned.strip(), flags=re.IGNORECASE)

    return cleaned.strip()


def parse_candidate_metadata(explanation: str, extracted_text: str = "") -> dict:
    """
    Extract structured candidate specifications from the model explanation
    and extracted package text when the medicine is absent from the fixed database.
    """
    meta = {
        "brand_name": None,
        "generic_name": None,
        "strength": None,
        "dosage_form": None,
        "manufacturer": None,
        "simple_explanation": None,
        "uses": [],
        "how_it_works": None,
        "side_effects": [],
        "warnings": [],
        "storage": None,
        "label_dosage": None,
        "active_ingredients": [],
    }

    if not explanation:
        return meta

    # 1. Brand name
    m_brand = re.search(
        r"[-*]\s*\**Brand\s*Name:\**\s*([^\n]+)",
        explanation,
        re.IGNORECASE,
    )
    if m_brand:
        val = m_brand.group(1).strip().strip("*").strip()
        if val.lower() not in ("not visible", "unclear", "unknown", "none", "n/a"):
            meta["brand_name"] = val

    # 2. Generic Name / Active Ingredients
    m_gen = re.search(
        r"[-*]\s*\**(?:Generic\s*Name(?:\s*\/\s*Active\s*Ingredients?)?|Active\s*Ingredients?)[^:]*:\**\s*([^\n]+)",
        explanation,
        re.IGNORECASE,
    )
    if m_gen:
        val = m_gen.group(1).strip().strip("*").strip()
        if val.lower() not in ("not visible", "unclear", "unknown", "none", "n/a"):
            meta["generic_name"] = val

    # 3. Dosage Form
    m_form = re.search(
        r"[-*]\s*\**Dosage\s*Form:\**\s*([^\n]+)",
        explanation,
        re.IGNORECASE,
    )
    if m_form:
        val = m_form.group(1).strip().strip("*").strip()
        if val.lower() not in ("not visible", "unclear", "unknown", "none", "n/a"):
            meta["dosage_form"] = val

    # 4. Manufacturer
    m_mfg = re.search(
        r"[-*]\s*\**Manufacturer:\**\s*([^\n]+)",
        explanation,
        re.IGNORECASE,
    )
    if m_mfg:
        val = m_mfg.group(1).strip().strip("*").strip()
        if val.lower() not in ("not visible", "unclear", "unknown", "none", "n/a"):
            meta["manufacturer"] = val

    # 5. Extract active ingredients and strengths from extracted label text and generic string
    detected_ingredients = []
    text_to_search = f"{extracted_text}\n{meta.get('generic_name') or ''}"
    lines = [l.strip() for l in text_to_search.splitlines() if l.strip()]
    for i, line in enumerate(lines):
        m_str = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg))\b", line, re.IGNORECASE)
        if m_str:
            str_val = m_str.group(1)
            prev_line = lines[i - 1] if i > 0 else ""
            candidate_line = line.replace(str_val, "").strip()
            if not candidate_line and prev_line:
                candidate_line = prev_line
            # Clean chemical prefixes and salt suffixes
            cleaned_ing = re.sub(
                r"\b(?:IP|BP|USP|eq\.? to|equivalent to|as|pellets|prolonged-release|gastro-resistant|capsules?|tablets?|each|contains?:?)\b",
                "",
                candidate_line,
                flags=re.IGNORECASE,
            ).strip()
            cleaned_ing = re.sub(r"[^\w\s-]", "", cleaned_ing).strip()
            if cleaned_ing and len(cleaned_ing) > 2:
                # Avoid duplicates
                if not any(d["name"].lower() == cleaned_ing.lower() for d in detected_ingredients):
                    detected_ingredients.append({
                        "id": str(uuid.uuid4()),
                        "name": cleaned_ing,
                        "strength": str_val,
                    })

    meta["active_ingredients"] = detected_ingredients

    # Derive overall strength from ingredients or text
    all_strengths = [d["strength"] for d in detected_ingredients if d.get("strength")]
    if all_strengths:
        meta["strength"] = " + ".join(dict.fromkeys(all_strengths))
    else:
        found_strengths = re.findall(r"\b\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg)\b", extracted_text, re.IGNORECASE)
        if found_strengths:
            meta["strength"] = " + ".join(dict.fromkeys(found_strengths))

    # 6. Uses section
    uses_match = re.search(
        r"(?:###?\s*2\.\s*Clinical\s*Uses|Clinical\s*Uses:?)([\s\S]*?)(?:###?\s*3\.|\Z)",
        explanation,
        re.IGNORECASE,
    )
    if uses_match:
        use_lines = [
            re.sub(r"^[-*\d.)\s]+", "", l).strip()
            for l in uses_match.group(1).splitlines()
            if l.strip().startswith(("-", "*", "1.", "2.", "3.", "4."))
        ]
        meta["uses"] = [u for u in use_lines if u][:6]

    # 7. Mechanism of action / How it works
    mech_match = re.search(
        r"(?:###?\s*3\.\s*(?:How\s*It\s*Works|Mechanism\s*of\s*Action)|How\s*It\s*Works:?)([\s\S]*?)(?:###?\s*4\.|\Z)",
        explanation,
        re.IGNORECASE,
    )
    if mech_match:
        meta["how_it_works"] = mech_match.group(1).strip()

    # 8. Side effects
    side_match = re.search(
        r"(?:###?\s*5\.\s*Common\s*Side\s*Effects|Common\s*Side\s*Effects:?)([\s\S]*?)(?:###?\s*6\.|\Z)",
        explanation,
        re.IGNORECASE,
    )
    if side_match:
        side_lines = [
            re.sub(r"^[-*\d.)\s]+", "", l).strip()
            for l in side_match.group(1).splitlines()
            if l.strip().startswith(("-", "*", "1.", "2.", "3.", "4."))
        ]
        meta["side_effects"] = [s for s in side_lines if s][:6]

    # 9. Warnings & Precautions
    warn_match = re.search(
        r"(?:###?\s*6\.\s*Warnings\s*&?\s*Precautions|Warnings\s*&?\s*Precautions:?)([\s\S]*?)(?:###?\s*7\.|\Z)",
        explanation,
        re.IGNORECASE,
    )
    if warn_match:
        warn_lines = [
            re.sub(r"^[-*\d.)\s]+", "", l).strip()
            for l in warn_match.group(1).splitlines()
            if l.strip().startswith(("-", "*", "1.", "2.", "3.", "4."))
        ]
        meta["warnings"] = [w for w in warn_lines if w][:6]

    # 10. Storage from label
    storage_match = re.search(r"Storage:\s*([^\n]+(?:\n[^\n]+)?)", extracted_text, re.IGNORECASE)
    if storage_match:
        meta["storage"] = storage_match.group(1).strip()

    # 11. Dosage guidance from label
    dosage_match = re.search(r"Dosage:\s*([^\n]+)", extracted_text, re.IGNORECASE)
    if dosage_match:
        meta["label_dosage"] = dosage_match.group(1).strip()

    # 12. Simple explanation
    if meta["uses"]:
        first_use = meta["uses"][0].replace("**", "")
        brand_or_gen = meta["brand_name"] or meta["generic_name"] or "This medicine"
        meta["simple_explanation"] = f"{brand_or_gen} is commonly used for {first_use} Always follow a doctor's prescription."

    return meta


def explain_medicine_information(
    medicine_name: str,
    extracted_text: str,
) -> str:
    """Generate a structured, evidence-based clinical explanation from package text."""
    if not extracted_text.strip():
        return "No readable package text was provided for analysis."

    prompt = f"""You are the clinical assistant for MediGuard AI.
Analyze the following text extracted directly from a medicine package.

Package Text:
{extracted_text}

Provide a clean, user-friendly, structured analysis under these exact headers:
### 1. Likely Medicine Identification
- **Brand Name:** (identify likely brand from text or 'Not visible')
- **Generic Name / Active Ingredients:** (list active ingredients and strengths visible on label)
- **Dosage Form:** (e.g. gastro-resistant capsule, prolonged-release tablet, oral suspension)
- **Manufacturer:** (manufacturing company if visible, or 'Not visible')
- **Evidence & Confidence:** (state what was confirmed on the packaging and identification confidence)

### 2. Clinical Uses
- Approved established uses for these active ingredients.

### 3. How It Works (Mechanism of Action)
- A simple, clear explanation of how the active ingredients work in the body.

### 4. How to Use Safely
- Official packaging/label administration instructions (e.g. swallow whole, storage). Note that actual dose, schedule, and duration must strictly follow the doctor's prescription. Do not prescribe or recommend personalized doses.

### 5. Common Side Effects
- Reasonably supported common side effects.

### 6. Warnings & Precautions
- Important contraindications, precautions, drug interactions, and prescription warning status (such as Schedule H).

### 7. Package Evidence vs Unverified Information
- Distinguish between facts directly extracted from package text versus clinical knowledge from model memory.
- State that live external database verification was not performed and identity must be confirmed by a licensed medical practitioner or pharmacist.

Rules:
- Strictly output only the final structured explanation.
- Do NOT output internal scratchpad notes, internal thinking, or special tokens.
- Do NOT invent ingredients, strengths, uses, or sources.
"""

    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1},
        )
        raw_content = response.get("message", {}).get("content", "")
        cleaned = clean_model_output(raw_content)
        if cleaned:
            return cleaned
        raise ValueError("Model returned empty or fully filtered response.")
    except Exception as err:
        logger.error(f"Ollama generation failed or returned unusable content: {err}")
        # Safe fallback providing evidence-based analysis notice without raw model errors
        return (
            "### Package Text Evidence Analysis\n\n"
            "An automated clinical synthesis could not be completed at this time.\n\n"
            "**Direct package evidence extracted:**\n"
            f"{extracted_text}\n\n"
            "*Notice: Model analysis is temporarily unavailable. Please verify this package directly with a licensed pharmacist or medical practitioner.*"
        )


def explain_medicine_from_images(
    image_paths: list[str],
    extracted_text: str,
) -> str:
    """
    Send uploaded medicine images + OCR text to MedGemma's vision API.
    Falls back to text-only analysis if vision call fails.

    MedGemma 1.5:4b has the 'vision' capability (CLIP projector).
    Ollama's chat API accepts base64-encoded images in the 'images' field.
    """
    # Encode each image as base64
    encoded_images: list[str] = []
    for path_str in image_paths:
        p = Path(path_str)
        if p.exists() and p.stat().st_size > 0:
            try:
                encoded_images.append(
                    base64.b64encode(p.read_bytes()).decode("utf-8")
                )
            except Exception as enc_err:
                logger.warning(f"Could not encode image {path_str}: {enc_err}")

    if not encoded_images:
        # No images available — fall back to text-only
        logger.warning("No valid images encoded; falling back to text-only analysis.")
        return explain_medicine_information(
            medicine_name="Unverified Package", extracted_text=extracted_text
        )

    # Build the vision prompt — identical structure to text-only prompt so
    # parse_candidate_metadata can parse the response regardless of path taken.
    ocr_section = (
        f"\n\nAdditionally, the following text was extracted from the label via OCR:\n{extracted_text}"
        if extracted_text.strip()
        else ""
    )

    prompt = f"""You are the clinical assistant for MediGuard AI.
You are shown one or more images of a medicine package. Examine the images carefully.
{ocr_section}

Using both what you can observe in the images and the extracted label text above, provide a clean, structured analysis under these exact headers:

### 1. Likely Medicine Identification
- **Brand Name:** (from image or label, or 'Not visible')
- **Generic Name / Active Ingredients:** (active ingredients and strengths visible on label)
- **Dosage Form:** (e.g. gastro-resistant capsule, prolonged-release tablet)
- **Manufacturer:** (if visible, or 'Not visible')
- **Evidence & Confidence:** (what was confirmed on the packaging and identification confidence)

### 2. Clinical Uses
- Approved established uses for these active ingredients.

### 3. How It Works (Mechanism of Action)
- A simple, clear explanation of how the active ingredients work in the body.

### 4. How to Use Safely
- Label administration instructions only. Actual dose, schedule, and duration must follow the doctor's prescription.

### 5. Common Side Effects
- Reasonably supported common side effects.

### 6. Warnings & Precautions
- Important contraindications, precautions, drug interactions, and prescription status.

### 7. Package Evidence vs Unverified Information
- Distinguish facts directly visible in the images or label text from clinical knowledge from model memory.
- State that live external database verification was not performed.

Rules:
- Output only the final structured explanation.
- Do NOT output internal scratchpad notes, thinking, or special tokens.
- Do NOT invent ingredients, strengths, uses, or sources not visible in the images or extracted text.
"""

    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": encoded_images,
            }],
            options={"temperature": 0.1},
        )
        raw_content = response.get("message", {}).get("content", "")
        cleaned = clean_model_output(raw_content)
        if cleaned:
            logger.info("Vision-based analysis completed successfully.")
            return cleaned
        raise ValueError("Model returned empty or fully filtered vision response.")
    except Exception as vision_err:
        logger.error(
            f"Vision-based Ollama call failed: {vision_err}. "
            "Falling back to text-only analysis."
        )
        # Graceful fallback: use OCR text alone
        return explain_medicine_information(
            medicine_name="Unverified Package", extracted_text=extracted_text
        )
