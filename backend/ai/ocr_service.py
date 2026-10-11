
import difflib
import json
import logging
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Local Windows OCR environment
OCR_PYTHON = (
    PROJECT_ROOT / ".venv-ocr" / "Scripts" / "python.exe"
)

# OCR worker script
OCR_WORKER = PROJECT_ROOT / "backend" / "ai" / "ocr_worker.py"

# Use the dedicated OCR environment on Windows.
# On Linux (Render), use the current Python interpreter.
if sys.platform == "win32":
    OCR_COMMAND = str(OCR_PYTHON)
else:
    OCR_COMMAND = sys.executable


def extract_text_from_image(
    image_path: str,
    source: str | None = None,
) -> dict:
    """Run PaddleOCR and tag lines with their image source."""

    image = Path(image_path).resolve()

    if not image.is_file():
        raise FileNotFoundError("The image file does not exist.")

    if sys.platform == "win32" and not OCR_PYTHON.is_file():
        raise RuntimeError("The OCR Python environment was not found.")

    if not OCR_WORKER.is_file():
        raise RuntimeError("The OCR worker was not found.")

    completed = subprocess.run(
        [OCR_COMMAND, str(OCR_WORKER), str(image)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
        check=False,
    )

    if completed.returncode != 0:
        try:
            error_payload = json.loads(
                completed.stdout.strip() or completed.stderr.strip()
            )
            err_msg = error_payload.get(
                "error",
                "OCR subprocess failed",
            )
        except Exception:
            err_msg = (
                completed.stderr.strip()
                or completed.stdout.strip()
                or "OCR subprocess failed"
            )

        raise RuntimeError(f"OCR execution failed: {err_msg}")

    try:
        stdout_text = completed.stdout.strip()
        json_line = stdout_text.splitlines()[-1] if stdout_text else "{}"
        data = json.loads(json_line)
    except Exception as e:
        raise RuntimeError(f"Failed to parse OCR output: {e}")

    if "error" in data:
        raise RuntimeError(f"OCR Error: {data['error']}")

    # Tag lines with their source image if provided.
    if source and "lines" in data:
        for line in data["lines"]:
            line["source"] = source

    return data


def is_garbage_or_microtext(text: str, conf: float) -> bool:
    """Detect unreadable artifacts, repetitive security stamps, or edge noise."""

    t = text.strip()
    words = t.split()

    # Unbroken long strings without spaces and low confidence.
    if len(words) == 1 and len(words[0]) >= 14 and conf < 0.75:
        return True

    # Repeating foil microtext patterns.
    for w in words:
        if len(w) >= 12:
            for sub_len in (3, 4, 5):
                for i in range(len(w) - sub_len):
                    sub = w[i:i + sub_len]
                    if w.count(sub) >= 2:
                        return True

    return False


def deduplicate_lines(
    lines: list[dict],
    min_confidence: float = 0.50,
) -> list[str]:
    """
    Clean and consolidate OCR lines from a single package side:
    - Eliminates low-confidence noise.
    - Filters repetitive security microtext.
    - Suppresses likely fragments and minor typos of dominant tokens.
    - Preserves unique sentences, ingredients, dosage forms, and warnings.
    """

    if not lines:
        return []

    counts: Counter = Counter()
    best_item: dict[str, dict] = {}

    for item in lines:
        text = str(item.get("text", "")).strip()
        conf = float(item.get("confidence", 1.0))

        if conf < min_confidence or len(text) <= 1:
            continue

        if is_garbage_or_microtext(text, conf):
            continue

        norm = re.sub(r"[^A-Za-z0-9]+", "", text).upper()

        if not norm:
            continue

        counts[norm] += 1

        if (
            norm not in best_item
            or conf > best_item[norm]["confidence"]
        ):
            best_item[norm] = {
                "text": text,
                "norm": norm,
                "confidence": conf,
            }

    ordered_norms: list[str] = []

    for item in lines:
        norm = re.sub(
            r"[^A-Za-z0-9]+",
            "",
            str(item.get("text", "")),
        ).upper()

        if norm in best_item and norm not in ordered_norms:
            ordered_norms.append(norm)

    retained: list[str] = []

    for norm in ordered_norms:
        info = best_item[norm]
        count = counts[norm]
        suppressed = False

        # Suppress likely fragments or typos of a dominant repeated token.
        for other_norm, other_count in counts.items():
            if other_norm == norm:
                continue

            if other_count >= 3 and count <= 2:
                sim = difflib.SequenceMatcher(
                    None,
                    norm,
                    other_norm,
                ).ratio()

                if (
                    sim >= 0.70
                    or norm in other_norm
                    or other_norm in norm
                ):
                    suppressed = True
                    break

        if not suppressed:
            retained.append(info["text"])

    return retained


def consolidate_ocr_results(
    front_result: dict | None,
    back_result: dict | None,
) -> dict:
    """
    Consolidate OCR results from front and back package images.
    Retains source-tagged raw lines and cleaned text for each side.
    """

    all_lines: list[dict] = []
    front_clean_lines: list[str] = []
    back_clean_lines: list[str] = []

    if front_result and "lines" in front_result:
        for line in front_result["lines"]:
            line_copy = dict(line)
            line_copy["source"] = "front"
            all_lines.append(line_copy)

        front_clean_lines = deduplicate_lines(
            front_result["lines"]
        )

    if back_result and "lines" in back_result:
        for line in back_result["lines"]:
            line_copy = dict(line)
            line_copy["source"] = "back"
            all_lines.append(line_copy)

        back_clean_lines = deduplicate_lines(
            back_result["lines"]
        )

    # Build consolidated package text.
    sections: list[str] = []

    if front_clean_lines and back_clean_lines:
        sections.append(
            "[Front of package]\n"
            + "\n".join(front_clean_lines)
        )
        sections.append(
            "[Back of package]\n"
            + "\n".join(back_clean_lines)
        )
    elif front_clean_lines:
        sections.append("\n".join(front_clean_lines))
    elif back_clean_lines:
        sections.append("\n".join(back_clean_lines))

    consolidated_text = "\n\n".join(sections).strip()

    return {
        "extracted_text": consolidated_text,
        "lines": all_lines,
        "front_lines": front_clean_lines,
        "back_lines": back_clean_lines,
    }
