import os
import re
import json
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


def extract_json_from_text(text: str) -> dict:
    """Parse JSON from AI response, stripping markdown fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(cleaned)


def sanitize_merchant(name: str) -> str:
    """
    Strip OCR logo artifacts that get prepended to real company names.
    e.g. "AM JAINEMO PRIVATE LIMITED" → "JAINEMO PRIVATE LIMITED"
         "AP RELIANCE JIO" → "RELIANCE JIO"
    """
    if not name:
        return name
    name = name.strip()
    # Strip a leading 1-4 uppercase-only word followed by a space
    cleaned = re.sub(r'^[A-Z]{1,4}\s+(?=[A-Z])', '', name).strip()
    return cleaned if cleaned else name


def sanitize_tax(tax_value, raw_text: str) -> float:
    """
    Only accept a tax value from the LLM if an explicit, standalone
    numerical tax line is found in the raw OCR text.
    Patterns that count as explicit: 'CGST ₹xxx', 'SGST: 500', 'Tax: ₹1,439'
    Patterns that do NOT count: '18% GST included', 'inclusive of tax'
    """
    # Check for an explicit tax line in OCR text: a tax keyword adjacent to a number
    explicit_tax_pattern = re.search(
        r'(CGST|SGST|IGST|Tax\s*:|GST\s*:)\s*[₹Rs.]?\s*[\d,]+\.?\d*',
        raw_text,
        re.IGNORECASE
    )
    if explicit_tax_pattern:
        return float(tax_value) if tax_value else 0.00
    # No standalone numeric tax line found — return 0
    return 0.00


@router.post("/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    """
    Accept a receipt image upload (JPEG/PNG/WebP), perform OCR via OCR.space,
    and structure the text into clean JSON using Groq.
    """
    groq_key = os.getenv("GROQ_API_KEY")

    # Demo fallback if no Groq key configured
    if not groq_key or groq_key.strip() in ("YOUR_GROQ_API_KEY", "", "null"):
        return {
            "merchant": "JAINEMO PRIVATE LIMITED",
            "date": "2023-12-20",
            "total_amount": 7999.00,
            "tax": 0.00,
            "currency": "INR",
            "line_items": [
                {"description": "Sigma | DSA & Web Development", "amount": 7999.00}
            ],
            "raw_text": "(Demo mode — add GROQ_API_KEY to enable real OCR)",
        }

    image_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"

    # Step 1: OCR via OCR.space Engine 2
    raw_text = ""
    try:
        payload = {
            "apikey": "helloworld",
            "isOverlayRequired": False,
            "language": "eng",
            "detectOrientation": True,
            "scale": True,
            "ocrEngine": 2,
        }
        files = {"file": (file.filename, image_bytes, mime_type)}
        ocr_response = requests.post(
            "https://api.ocr.space/parse/image",
            data=payload,
            files=files,
            timeout=15
        )
        if ocr_response.status_code == 200:
            ocr_data = ocr_response.json()
            if not ocr_data.get("IsErroredOnProcessing"):
                parsed_results = ocr_data.get("ParsedResults", [])
                if parsed_results:
                    raw_text = parsed_results[0].get("ParsedText", "")
        if not raw_text:
            raw_text = f"Receipt scanned. Filename: {file.filename}."
    except Exception as e:
        print("[OCR.space Failed]", str(e))
        raw_text = f"Receipt scanned. Filename: {file.filename}."

    print(f"[OCR Raw Text]:\n{raw_text[:500]}")  # Debug: log first 500 chars

    # Step 2: Groq LLM structuring
    prompt = f"""You are an expert invoice parser. Extract data from the following OCR text into JSON.

RULES (follow exactly):
1. MERCHANT: Extract the PRIMARY company name from the document header only.
   - Ignore any small logo text or brand watermarks that appear before the company name.
   - Only return the legal entity name printed prominently at the top (e.g. "JAINEMO PRIVATE LIMITED").

2. DATE: Use the payment date or transaction date in YYYY-MM-DD format.

3. TAX: Return 0.00 UNLESS there is a dedicated line item showing an explicit tax amount with a number
   (e.g., "CGST: ₹719.91", "SGST ₹500.00", "IGST: ₹1439.82", "Tax: ₹200").
   - "18% GST included" alone means tax is embedded in the total — set tax to 0.00.
   - Do NOT calculate tax percentages yourself.

4. TOTAL: Grand Total / Amount Paid / Final Invoice Value.

Return ONLY valid JSON, no markdown, no explanation:
{{
  "merchant": "company name",
  "date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "tax": 0.00,
  "currency": "INR",
  "line_items": [{{"description": "item", "amount": 0.00}}],
  "raw_text": "full raw text"
}}

OCR Text:
{raw_text}"""

    try:
        from groq import Groq

        client = Groq(api_key=groq_key)
        models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        last_err = None

        for model_name in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=1024,
                )
                output = response.choices[0].message.content
                parsed = extract_json_from_text(output)

                # ── Hard Post-Processing (overrides LLM if needed) ───────────
                # 1. Clean OCR logo artifacts from merchant name
                if parsed.get("merchant"):
                    parsed["merchant"] = sanitize_merchant(str(parsed["merchant"]))

                # 2. Validate tax — only allow explicit itemised tax amounts
                parsed["tax"] = sanitize_tax(parsed.get("tax", 0), raw_text)

                # 3. Ensure raw_text is populated
                if not parsed.get("raw_text") or parsed.get("raw_text") in ("full raw text", ""):
                    parsed["raw_text"] = raw_text

                print(f"[OCR Result] merchant={parsed.get('merchant')} tax={parsed.get('tax')}")
                return parsed

            except Exception as e:
                last_err = e
                continue

        raise HTTPException(
            status_code=503,
            detail=f"All models failed. Last error: {str(last_err)}"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")
