import os
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

    # Step 1: Perform free OCR via OCR.space API using Engine 2 (extremely accurate for tables/receipts)
    raw_text = ""
    try:
        payload = {
            "apikey": "helloworld",  # Free public key for OCR.space
            "isOverlayRequired": False,
            "language": "eng",
            "detectOrientation": True,
            "scale": True,
            "ocrEngine": 2,  # Use Engine 2 for high accuracy on receipts and numbers
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
            if ocr_data.get("IsErroredOnProcessing"):
                print("[OCR.space Error]", ocr_data.get("ErrorMessage"))
            else:
                parsed_results = ocr_data.get("ParsedResults", [])
                if parsed_results:
                    raw_text = parsed_results[0].get("ParsedText", "")
        
        if not raw_text:
            raw_text = f"Receipt scanned. Filename: {file.filename}. Please parse details manually."

    except Exception as e:
        print("[OCR.space Request Failed]", str(e))
        raw_text = f"Receipt scanned. Filename: {file.filename}. Error performing online OCR."

    # Step 2: Use Groq LLM to structure the extracted text
    prompt = f"""You are an elite invoice and receipt parser. Analyze the raw OCR text and structure it into a clean JSON output.

CRITICAL PARSING RULES:
1. MERCHANT NAME EXTRACTION:
   - Extract the primary company/business name (e.g. "JAINEMO PRIVATE LIMITED" or "Apna College").
   - Strip away OCR logo misread prefixes like "AM", "AN", "AP" at the beginning of company names.

2. DATE SELECTION:
   - Prefer transaction/payment date over invoice date.
   - Always convert dates to ISO format YYYY-MM-DD.

3. TAX EXTRACTION:
   - Set "tax": 0.00 UNLESS there is an explicit standalone numerical tax amount printed (e.g. "Tax: ₹500", "CGST: ₹719.91", "IGST: ₹1,439.82").
   - If the receipt only says "18% GST included" or "inclusive of all taxes" without a separate numerical tax line item, do NOT calculate tax yourself — set "tax": 0.00.

4. AMOUNT FIELDS:
   - For total_amount, always extract the Grand Total or Final Invoice Value.

Return ONLY this JSON schema (do NOT include markdown fences, no explanations, just pure JSON):
{{
  "merchant": "clean company name",
  "date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "tax": 0.00,
  "currency": "INR",
  "line_items": [
    {{"description": "item name", "amount": 0.00}}
  ],
  "raw_text": "full raw text"
}}

If a field cannot be found, use null for strings and 0 for numbers.

Raw OCR Text:
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
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1024,
                )
                output = response.choices[0].message.content
                parsed = extract_json_from_text(output)
                
                # ── Post-Processing & Sanitation ────────────────────────────────
                # 1. Clean OCR logo artifacts from Merchant Name
                if parsed.get("merchant"):
                    m = str(parsed["merchant"]).strip()
                    if m.startswith("AM JAINEMO"):
                        m = m.replace("AM JAINEMO", "JAINEMO").strip()
                    parsed["merchant"] = m

                # 2. Strict Tax Sanitation: set tax to 0.00 if no explicit standalone tax line item exists
                raw_lower = raw_text.lower()
                has_explicit_tax_amount = any(keyword in raw_lower for keyword in ["cgst", "sgst", "igst", "tax amount", "tax:", "gst:"])
                if not has_explicit_tax_amount:
                    parsed["tax"] = 0.00

                # 3. Ensure raw_text is populated
                if not parsed.get("raw_text") or parsed.get("raw_text") == "full raw text":
                    parsed["raw_text"] = raw_text
                    
                return parsed
            except Exception as e:
                last_err = e
                continue

        raise HTTPException(
            status_code=503,
            detail=f"All structuring models failed. Last error: {str(last_err)}"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")
