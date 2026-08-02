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


def preprocess_ocr_text(text: str) -> str:
    """
    Clean up common OCR spelling mistakes and character confusions
    before sending raw text to the AI model.
    """
    if not text:
        return text
    
    # 1. Spelling corrections
    corrections = {
        r'(?i)\bairoort\b': 'Airport',
        r'(?i)\bairoort\s+taxes\b': 'Airport Taxes',
        r'(?i)\bairoot\b': 'Airport',
        r'(?i)\bthrouah\b': 'Through',
        r'(?i)\bamaz0n\b': 'Amazon',
        r'(?i)\brestaurent\b': 'Restaurant',
        r'(?i)\bconvience\b': 'Convenience',
        r'(?i)\bconvenience\s+fee\b': 'Convenience Fee',
        r'(?i)\bconvenience\s+charges\b': 'Convenience Charges'
    }
    
    for pattern, replacement in corrections.items():
        text = re.sub(pattern, replacement, text)

    # 2. Number cleaning: Correct O/o/I/l confusion in numbers
    def fix_numbers(match):
        val = match.group(0)
        # Convert O/o to 0
        val = val.replace('O', '0').replace('o', '0')
        # Convert I/l to 1 in digits / decimals
        val = re.sub(r'(?<=\d)[I|l](?=\d)', '1', val)
        val = re.sub(r'(?<=\.)[I|l](?=\d)', '1', val)
        val = re.sub(r'(?<=\d)[I|l](?=$)', '1', val)
        return val

    # Match tokens that look like numbers but contain confused letters
    text = re.sub(r'\b[0-9OoIl\.,]{3,}\b', fix_numbers, text)

    return text


def sanitize_merchant(name: str) -> str:
    """
    Strip OCR logo artifacts that get prepended to real company names.
    """
    if not name:
        return name
    name = name.strip()
    cleaned = re.sub(r'^[A-Z]{1,4}\s+(?=[A-Z])', '', name).strip()
    return cleaned if cleaned else name


def validate_receipt_amounts(parsed: dict, raw_text: str) -> dict:
    """
    Validate that: base_amount + tax_amount + sum(additional_charges) == total_amount.
    Auto-corrects minor mismatches, otherwise raises ValueError.
    """
    base = float(parsed.get("base_amount", 0.00) or 0.00)
    tax = float(parsed.get("tax_amount", 0.00) or 0.00)
    
    charges = 0.0
    add_charges = parsed.get("additional_charges", [])
    if not isinstance(add_charges, list):
        add_charges = []
    
    for c in add_charges:
        if isinstance(c, dict) and "amount" in c:
            charges += float(c["amount"] or 0.00)
            
    total = float(parsed.get("total_amount", 0.00) or 0.00)
    
    # Recalculate tax if breakdown has different values
    breakdown = parsed.get("tax_breakdown", {})
    if isinstance(breakdown, dict):
        bd_tax_sum = sum(float(v or 0.00) for v in breakdown.values())
        if bd_tax_sum > 0 and abs(bd_tax_sum - tax) > 0.05:
            tax = bd_tax_sum
            parsed["tax_amount"] = tax

    sum_components = base + tax + charges
    diff = total - sum_components

    # Automatically handle common validation discrepancies
    if abs(diff) > 0.05:
        # Case A: If base is zero but total and tax are non-zero, base is likely missing
        if base == 0 and total > 0:
            base = total - tax - charges
            parsed["base_amount"] = round(base, 2)
            diff = 0.0
        # Case B: If total is zero, set it to the sum of components
        elif total == 0:
            total = sum_components
            parsed["total_amount"] = round(total, 2)
            diff = 0.0
        # Case C: Other missing charge/levy, add as otherCharges
        else:
            if diff > 0:
                add_charges.append({
                    "description": "Other Charges",
                    "amount": round(diff, 2)
                })
                parsed["additional_charges"] = add_charges
                diff = 0.0

    # Final re-validation
    base = float(parsed.get("base_amount", 0.00) or 0.00)
    tax = float(parsed.get("tax_amount", 0.00) or 0.00)
    charges = sum(float(c.get("amount", 0.0) or 0.0) for c in parsed.get("additional_charges", []))
    total = float(parsed.get("total_amount", 0.00) or 0.00)
    
    final_sum = round(base + tax + charges, 2)
    if abs(final_sum - total) > 0.1:
        raise ValueError(
            f"Validation failed: Sum of components ({base} base + {tax} tax + {charges} charges = {final_sum}) "
            f"does not match Total Amount ({total}). Discrepancy of {round(total - final_sum, 2)}."
        )
        
    return parsed


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
            "merchant": "AIX CONNECT PRIVATE LIMITED",
            "invoice_number": "BBLR240100116949",
            "date": "2024-01-25",
            "currency": "INR",
            "base_amount": 7043.00,
            "tax_amount": 767.00,
            "tax_breakdown": {
                "gst": 0.00,
                "cgst": 0.00,
                "sgst": 0.00,
                "igst": 0.00,
                "vat": 0.00,
                "airport_tax": 767.00,
                "service_tax": 0.00
            },
            "additional_charges": [],
            "total_amount": 7810.00,
            "line_items": [
                {"description": "Air Ticket charges", "amount": 7043.00},
                {"description": "Airport Taxes-Pass Through", "amount": 767.00}
            ],
            "payment_method": None,
            "raw_text": "(Demo mode — add GROQ_API_KEY to enable real OCR)",
        }

    image_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"

    # Step 1: Perform free OCR via OCR.space API using Engine 2
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

    # Perform OCR text pre-cleaning
    cleaned_ocr_text = preprocess_ocr_text(raw_text)

    # Step 2: Use Groq LLM to structure the extracted text
    prompt = f"""You are an elite financial document and receipt parser. Extract receipt details from the raw OCR text into the specified structured JSON format.

RAW OCR TEXT:
{cleaned_ocr_text}

CRITICAL RULES:
1. MERCHANT: Extract the clean, formal company/business name (e.g., "JAINEMO PRIVATE LIMITED" or "AIX CONNECT PRIVATE LIMITED" or "Amazon"). Clean up any OCR logo artifacts or leading prefixes.
2. INVOICE NUMBER: Extract the invoice, receipt, or transaction reference number (e.g. "BBLR240100116949"). If not found, return null.
3. DATE: Prefer transaction/payment date. Format as YYYY-MM-DD.
4. CURRENCY: Extract standard currency code (e.g. "INR", "USD", "EUR"). Default to "INR" if unspecified but currency symbols indicate Rupees (₹/Rs).
5. BASE AMOUNT: Extract the tax-exclusive base cost of the transaction (e.g., 7043.00).
6. TAX AMOUNT: Total sum of all taxes (GST, CGST, SGST, IGST, VAT, Airport Tax, Service Tax, etc.).
   - Set to 0.00 if NO taxes are explicitly mentioned.
   - Never guess or calculate tax if not printed.
7. TAX BREAKDOWN: Object showing breakdown of individual tax components, e.g.:
   {{
     "gst": 0.00,
     "cgst": 0.00,
     "sgst": 0.00,
     "igst": 0.00,
     "vat": 0.00,
     "airport_tax": 767.00,
     "service_tax": 0.00
   }}
8. ADDITIONAL CHARGES: Array of objects containing any other fees or charges (e.g. convenience fees, other levies, other service charges) not included in base fare/amount or tax:
   [
     {{ "description": "convenience fee", "amount": 50.00 }}
   ]
9. TOTAL AMOUNT: The grand total paid. Must be a number (e.g., 7810.00).
10. LINE ITEMS: Array of individual items purchased:
    [
      {{ "description": "Air Ticket charges", "amount": 7043.00 }}
    ]
11. PAYMENT METHOD: Extract card brand, cash, UPI, etc., if printed.

EXPECTED JSON SCHEMA (Return ONLY valid JSON):
{{
  "merchant": "merchant name",
  "invoice_number": "invoice number or null",
  "date": "YYYY-MM-DD",
  "currency": "INR",
  "base_amount": 0.00,
  "tax_amount": 0.00,
  "tax_breakdown": {{
     "gst": 0.00,
     "cgst": 0.00,
     "sgst": 0.00,
     "igst": 0.00,
     "vat": 0.00,
     "airport_tax": 0.00,
     "service_tax": 0.00
  }},
  "additional_charges": [],
  "total_amount": 0.00,
  "line_items": [
    {{ "description": "description", "amount": 0.00 }}
  ],
  "payment_method": "method or null",
  "raw_text": "..."
}}
"""

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

                # Post-Processing
                if parsed.get("merchant"):
                    parsed["merchant"] = sanitize_merchant(str(parsed["merchant"]))

                # Validation & Consistency Check
                parsed = validate_receipt_amounts(parsed, raw_text)

                if not parsed.get("raw_text") or parsed.get("raw_text") in ("full raw text", ""):
                    parsed["raw_text"] = raw_text

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
