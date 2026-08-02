import os
import re
import json
import sys

# Force UTF-8 output so Windows charmap encoding never crashes on Unicode chars
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def safe_log(msg: str) -> None:
    """Print safely on any platform/encoding. Non-encodable chars become '?'."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"))

import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


# ─── JSON extraction ─────────────────────────────────────────────────────────

def extract_json_from_text(text: str) -> dict:
    """
    Parse JSON from AI response.
    Handles: pure JSON, ```json ... ```, conversational wrappers.
    """
    cleaned = text.strip()
    # Find outermost JSON object
    start = cleaned.find('{')
    end   = cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start:end + 1]
    return json.loads(cleaned)


# ─── OCR text pre-processing ──────────────────────────────────────────────────

def preprocess_ocr_text(text: str) -> str:
    """
    Correct common OCR spelling mistakes before sending to AI.
    Never modifies numeric values.
    """
    if not text:
        return text

    word_corrections = {
        r'(?i)\bairoort\b':        'Airport',
        r'(?i)\bairp0rt\b':        'Airport',
        r'(?i)\bairoort\s+taxes\b': 'Airport Taxes',
        r'(?i)\bthrouah\b':        'Through',
        r'(?i)\brestaurent\b':     'Restaurant',
        r'(?i)\bamaz0n\b':         'Amazon',
        r'(?i)\bconvience\b':      'Convenience',
        r'(?i)\blnvoice\b':        'Invoice',
        r'(?i)\bDatc\b':           'Date',
        r'(?i)\bT0tal\b':          'Total',
        r'(?i)\bGrand T0tal\b':    'Grand Total',
    }
    for pattern, replacement in word_corrections.items():
        text = re.sub(pattern, replacement, text)
    return text


# ─── Merchant sanitization ────────────────────────────────────────────────────

def sanitize_merchant(name: str) -> str:
    """
    Strip ONLY 2-character OCR logo artifacts that get prepended to company names.
    e.g.  "AM JAINEMO PRIVATE LIMITED"  →  "JAINEMO PRIVATE LIMITED"   ✓
          "AIX CONNECT PRIVATE LIMITED" →  "AIX CONNECT PRIVATE LIMITED" ✓  (AIX kept)
          "AP RELIANCE JIO"             →  "RELIANCE JIO"               ✓
    Rule: strip a leading word of EXACTLY 2 uppercase letters followed by a space.
    """
    if not name:
        return name
    name = name.strip()
    # Only strip if the leading word is exactly 2 uppercase ASCII letters
    cleaned = re.sub(r'^[A-Z]{2}\s+(?=[A-Z])', '', name).strip()
    return cleaned if cleaned else name


# ─── Tax enforcement ──────────────────────────────────────────────────────────

def enforce_tax(parsed: dict, raw_text: str) -> dict:
    """
    STRICT TAX RULE — never invent, estimate, or calculate tax.

    Step 1: If OCR text contains "X% GST included" / "inclusive of tax" etc.
            → tax is EMBEDDED in the price → force tax_amount = 0

    Step 2: If tax_amount is already 0 → nothing to do.

    Step 3: Confirm an explicit separate tax entry exists via:
            (a) The tax amount value appears near a tax keyword in the raw OCR text.
            (b) A line item description contains a tax keyword AND has amount > 0.
            (c) Raw text matches classic "CGST: 500.00" style patterns.
            If none confirmed → force tax_amount = 0.
    """
    tax = float(parsed.get("tax_amount", 0.00) or 0.00)
    raw_lower = raw_text.lower()

    # ── Step 1: inclusive-tax phrasing → always 0 ──────────────────────────
    inclusive_patterns = [
        r'\d+\s*%\s*gst\s+included',
        r'gst\s+included',
        r'tax\s+included',
        r'incl\.\s*tax',
        r'inclusive\s+of\s+tax',
        r'inclusive\s+of\s+all\s+taxes',
        r'all\s+taxes\s+included',
        r'including\s+gst',
        r'including\s+all\s+taxes',
        r'taxes\s+included',
        r'tax\s+is\s+included',
    ]
    for patt in inclusive_patterns:
        if re.search(patt, raw_lower):
            parsed["tax_amount"] = 0.00
            if isinstance(parsed.get("tax_breakdown"), dict):
                parsed["tax_breakdown"] = {k: 0.00 for k in parsed["tax_breakdown"]}
            total   = float(parsed.get("total_amount", 0.00) or 0.00)
            charges = sum(float(c.get("amount", 0.0) or 0.0)
                          for c in (parsed.get("additional_charges") or []))
            parsed["base_amount"] = round(total - charges, 2)
            print(f"[TaxEnforcer] Inclusive-tax phrase → tax forced 0, base={parsed['base_amount']}")
            return parsed

    # ── Step 2: already 0, nothing to do ───────────────────────────────────
    if tax == 0.0:
        return parsed

    # ── Step 3a: value-proximity check ─────────────────────────────────────
    # Build numeric representations of the tax value to look for in raw text
    tax_round = round(tax, 2)
    tax_variants = set()
    tax_variants.add(str(int(tax_round)) if tax_round == int(tax_round) else str(tax_round))
    tax_variants.add(f"{tax_round:.2f}")
    tax_variants.add(f"{tax_round:.2f}".replace(".", ","))
    # e.g. 767 → {"767", "767.00", "767,00"}

    TAX_LABEL_RE = re.compile(
        r'(tax|gst|cgst|sgst|igst|vat|cess|duty|levy|airport|service\s*tax)',
        re.IGNORECASE
    )
    for tv in tax_variants:
        escaped = re.escape(tv)
        # Check: tax label within 120 chars before/after the tax amount in the raw text
        pattern = rf'(?:(.{{0,120}}){escaped}|{escaped}(.{{0,120}}))'
        for m in re.finditer(escaped, raw_text, re.IGNORECASE):
            start = max(0, m.start() - 120)
            end   = min(len(raw_text), m.end() + 120)
            context = raw_text[start:end]
            if TAX_LABEL_RE.search(context):
                print(f"[TaxEnforcer] Found tax value {tv} near tax label → keeping tax={tax}")
                return parsed

    # ── Step 3b: line_items tax classification ──────────────────────────────
    TAX_KEYWORDS = ["tax", "gst", "cgst", "sgst", "igst", "vat", "cess",
                    "duty", "levy", "airport charge", "service tax", "airport tax"]
    for item in (parsed.get("line_items") or []):
        desc = str(item.get("description", "")).lower()
        amt  = float(item.get("amount", 0.0) or 0.0)
        if any(k in desc for k in TAX_KEYWORDS) and amt > 0:
            print(f"[TaxEnforcer] Tax line item '{item.get('description')}' amt={amt} → keeping")
            return parsed

    # ── Step 3c: classic "CGST: 500.00" patterns in raw text ───────────────
    explicit_patterns = [
        r'(cgst|sgst|igst)\s*[:\-]\s*[₹Rs\.]?\s*[\d,]+\.\d{2}',
        r'(vat|cess|duty)\s*[:\-]\s*[₹Rs\.]?\s*[\d,]+\.\d{2}',
        r'(gst|tax\s+amount|service\s+tax)\s*[:\-]\s*[₹Rs\.]?\s*[\d,]+\.\d{2}',
        r'airport[\s\-]+tax(es)?[\s\-]+(pass[\s\-]+through[\s\-]+)?[\d,]+\.\d{2}',
    ]
    for patt in explicit_patterns:
        if re.search(patt, raw_lower):
            print(f"[TaxEnforcer] Classic tax pattern matched → keeping tax={tax}")
            return parsed

    # ── No confirmation found → force 0 ────────────────────────────────────
    parsed["tax_amount"] = 0.00
    if isinstance(parsed.get("tax_breakdown"), dict):
        parsed["tax_breakdown"] = {k: 0.00 for k in parsed["tax_breakdown"]}
    total   = float(parsed.get("total_amount", 0.00) or 0.00)
    charges = sum(float(c.get("amount", 0.0) or 0.0)
                  for c in (parsed.get("additional_charges") or []))
    parsed["base_amount"] = round(total - charges, 2)
    print(f"[TaxEnforcer] No explicit tax confirmed → tax forced 0, base={parsed['base_amount']}")
    return parsed



# ─── Line-item component balancing ───────────────────────────────────────────

def split_components_from_line_items(parsed: dict) -> dict:
    """
    If the LLM returned base_amount == total_amount (treating total as base),
    scan the line_items and reclassify tax/charge items to get the correct breakdown.
    """
    line_items = parsed.get("line_items") or []
    if not line_items:
        return parsed

    total = float(parsed.get("total_amount", 0.00) or 0.00)
    base  = float(parsed.get("base_amount",  0.00) or 0.00)
    tax   = float(parsed.get("tax_amount",   0.00) or 0.00)
    chrgs = sum(float(c.get("amount", 0.0) or 0.0)
                for c in (parsed.get("additional_charges") or []))

    # Only reclassify if base ≈ total (indicating the LLM didn't separate components)
    if not (abs(base - total) < 0.05 and tax == 0.0 and chrgs == 0.0):
        return parsed

    TAX_KEYS  = ["tax", "gst", "cgst", "sgst", "igst", "vat", "cess",
                 "duty", "levy", "airport charge", "service tax", "airport tax"]
    CHRG_KEYS = ["fee", "convenience", "handling", "surcharge", "service charge"]

    new_base   = 0.0
    new_tax    = 0.0
    new_chrgs  = []
    breakdown  = dict(parsed.get("tax_breakdown") or {})

    for item in line_items:
        desc = str(item.get("description", "")).lower()
        amt  = float(item.get("amount", 0.0) or 0.0)

        if any(k in desc for k in TAX_KEYS):
            new_tax += amt
            if   "airport" in desc:       breakdown["airport_tax"]   = breakdown.get("airport_tax",   0.0) + amt
            elif "cgst"    in desc:       breakdown["cgst"]          = breakdown.get("cgst",          0.0) + amt
            elif "sgst"    in desc:       breakdown["sgst"]          = breakdown.get("sgst",          0.0) + amt
            elif "igst"    in desc:       breakdown["igst"]          = breakdown.get("igst",          0.0) + amt
            elif "vat"     in desc:       breakdown["vat"]           = breakdown.get("vat",           0.0) + amt
            elif "service" in desc:       breakdown["service_tax"]   = breakdown.get("service_tax",   0.0) + amt
            else:                         breakdown["gst"]           = breakdown.get("gst",           0.0) + amt
        elif any(k in desc for k in CHRG_KEYS):
            new_chrgs.append({"description": item.get("description"), "amount": amt})
            new_base += amt   # will be subtracted below
        else:
            new_base += amt

    # Confirm the split sums to the total
    total_check = new_base + new_tax + sum(c["amount"] for c in new_chrgs)
    if abs(total_check - total) < 0.05:
        parsed["base_amount"]        = round(new_base, 2)
        parsed["tax_amount"]         = round(new_tax, 2)
        parsed["tax_breakdown"]      = breakdown
        parsed["additional_charges"] = new_chrgs
        print(f"[Splitter] Reclassified -> base={new_base} tax={new_tax} charges={new_chrgs}")

    return parsed


# ─── Amount validation ────────────────────────────────────────────────────────

def validate_amounts(parsed: dict) -> dict:
    """
    Verify:  base + tax + charges - discount == total
    Auto-corrects minor rounding gaps; logs bigger mismatches.
    """
    base     = float(parsed.get("base_amount",  0.00) or 0.00)
    tax      = float(parsed.get("tax_amount",   0.00) or 0.00)
    discount = float(parsed.get("discount",     0.00) or 0.00)
    total    = float(parsed.get("total_amount", 0.00) or 0.00)
    charges  = sum(float(c.get("amount", 0.0) or 0.0)
                   for c in (parsed.get("additional_charges") or []))

    computed = round(base + tax + charges - discount, 2)
    diff     = round(total - computed, 2)

    if abs(diff) <= 0.05:
        return parsed

    # Auto-fix: if base is 0 but total is known, derive base
    if base == 0 and total > 0:
        parsed["base_amount"] = round(total - tax - charges + discount, 2)
    elif abs(diff) < 5:
        # Minor rounding: absorb into base
        parsed["base_amount"] = round(base + diff, 2)
    else:
        print(f"[Validation] Mismatch: {base} base + {tax} tax + {charges} charges "
              f"- {discount} discount = {computed}, expected {total}, diff = {diff}")

    return parsed


# ─── Travel date corrector ────────────────────────────────────────────────────

def correct_travel_date(parsed: dict, raw_text: str) -> dict:
    """
    For airline / travel / hotel documents:
    If the raw OCR text contains an explicit Flight Date / Travel Date /
    Journey Date / Check-in Date, override the LLM-extracted date with that
    value — because the LLM may have wrongly preferred the Invoice Date.

    Handles formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD
    """
    TRAVEL_DATE_PATTERNS = [
        # Label first, then date value
        r'(?:Flight\s+Date|Travel\s+Date|Journey\s+Date|Departure\s+Date|'
        r'Check[\-\s]?in\s+Date|Date\s+of\s+Travel|Date\s+of\s+Journey|'
        r'Date\s+of\s+Departure|Service\s+Date)\s*[:\-]?\s*'
        r'(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\d{4}[\-\/\.]\d{2}[\-\/\.]\d{2})',
    ]

    for pattern in TRAVEL_DATE_PATTERNS:
        m = re.search(pattern, raw_text, re.IGNORECASE)
        if m:
            raw_date = m.group(1).strip()
            # Try to normalise to YYYY-MM-DD
            iso_date = None
            for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y",
                        "%d-%m-%y", "%d/%m/%y",
                        "%Y-%m-%d", "%Y/%m/%d"):
                try:
                    from datetime import datetime as _dt
                    iso_date = _dt.strptime(raw_date, fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue

            if iso_date:
                old_date = parsed.get("date")
                parsed["date"] = iso_date
                print(f"[TravelDate] Overrode date {old_date!r} -> {iso_date!r} "
                      f"from pattern '{m.group(0).strip()}'")
                return parsed

    return parsed


# ─── Canonical empty result ───────────────────────────────────────────────────

def empty_result() -> dict:
    return {
        "merchant":          None,
        "invoice_number":    None,
        "date":              None,
        "currency":          "INR",
        "base_amount":       0.00,
        "tax_amount":        0.00,
        "tax_breakdown":     {"cgst": 0.00, "sgst": 0.00, "igst": 0.00,
                              "gst": 0.00, "vat": 0.00,
                              "airport_tax": 0.00, "service_tax": 0.00},
        "additional_charges": [],
        "discount":          0.00,
        "total_amount":      0.00,
        "line_items":        [],
        "payment_method":    None,
        "raw_text":          None,
    }


# ─── Main endpoint ────────────────────────────────────────────────────────────

@router.post("/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    """
    Full pipeline:
      Image → OCR.space → text cleanup → Groq LLM → post-processing → return
    """
    groq_key = os.getenv("GROQ_API_KEY")

    # ── Demo fallback ────────────────────────────────────────────────────────
    if not groq_key or groq_key.strip() in ("YOUR_GROQ_API_KEY", "", "null"):
        demo = empty_result()
        demo.update({
            "merchant":       "JAINEMO PRIVATE LIMITED",
            "invoice_number": "pay_NEeDyyapCdkfW",
            "date":           "2023-12-20",
            "base_amount":    7999.00,
            "total_amount":   7999.00,
            "line_items":     [{"description": "Sigma | DSA & Web Development", "amount": 7999.00}],
            "raw_text":       "(Demo — add GROQ_API_KEY to use real OCR)",
        })
        return demo

    image_bytes = await file.read()
    mime_type   = file.content_type or "image/jpeg"

    # Detect PDF by content-type or filename extension
    filename    = file.filename or ""
    is_pdf      = (mime_type == "application/pdf" or filename.lower().endswith(".pdf"))
    if is_pdf:
        mime_type = "application/pdf"

    # ── Step 1: OCR via OCR.space engine 2 ───────────────────────────────────
    raw_text = ""
    try:
        ocr_data_params = {
            "apikey":            "helloworld",
            "isOverlayRequired": False,
            "language":          "eng",
            "detectOrientation": True,
            "scale":             True,
            "ocrEngine":         2,
        }
        if is_pdf:
            # For PDFs: extract text from first page; prefer text layer if present
            ocr_data_params["filetype"]               = "PDF"
            ocr_data_params["isTable"]                = True
            ocr_data_params["OCREngine"]              = 2

        ocr_resp = requests.post(
            "https://api.ocr.space/parse/image",
            data=ocr_data_params,
            files={"file": (filename, image_bytes, mime_type)},
            timeout=30,
        )
        if ocr_resp.status_code == 200:
            ocr_data = ocr_resp.json()
            if not ocr_data.get("IsErroredOnProcessing"):
                results = ocr_data.get("ParsedResults", [])
                if results:
                    raw_text = results[0].get("ParsedText", "")
    except Exception as e:
        print(f"[OCR.space failed] {e}")

    if not raw_text:
        raw_text = f"Receipt. Filename: {file.filename}"

    cleaned_text = preprocess_ocr_text(raw_text)
    print(f"[OCR] First 400 chars:\n{cleaned_text[:400]}")

    # ── Step 2: Groq LLM structuring ─────────────────────────────────────────
    prompt = f"""You are a financial document parser. Extract receipt data from the OCR text below and return ONLY a JSON object - no markdown, no prose.

OCR TEXT:
{cleaned_text}

EXTRACTION RULES:

1. MERCHANT - Use the primary legal company name printed at the top of the document.
   Strip any single 2-letter prefix that is an OCR artifact (e.g. "AM JAINEMO" -> "JAINEMO PRIVATE LIMITED").
   Do NOT strip legitimate 3-letter abbreviations (e.g. "AIX CONNECT PRIVATE LIMITED" stays as-is).

2. DATE — Extract the date the TRANSACTION / SERVICE actually occurred. Priority order:
   (a) For travel/airline/hotel documents: use the TRAVEL DATE / FLIGHT DATE / CHECK-IN DATE / JOURNEY DATE — NOT the Invoice Date or Bill of Supply date.
   (b) For shopping receipts: use the Purchase Date / Transaction Date / Sale Date.
   (c) For service invoices: use the Service Date if present, otherwise fall back to Invoice Date.
   (d) Last resort: any other date printed on the document.
   Return in ISO format: YYYY-MM-DD.
   CRITICAL: For Air India / airline bills, "Flight Date" = the correct date. "Invoice Date" is an administrative date — do NOT use it.
   NEVER use today's date unless it explicitly appears on the receipt.

3. INVOICE NUMBER — Extract the invoice/receipt/reference number. Return null if absent.

4. TAX - CRITICAL RULE:
   * If the receipt has an EXPLICIT separate tax line with a printed amount
     (e.g. "Airport Taxes: 767.00", "CGST: 500.00", "SGST 250.00", "GST 100") -> set tax_amount to that exact amount.
   * If the receipt says "18% GST included", "inclusive of tax", "taxes included" WITHOUT a
     separate numeric line -- the tax is ALREADY inside the total -> set tax_amount to 0.00.
   * NEVER calculate, estimate, or reverse-engineer a tax value.
   * NEVER leave tax_amount null -- always return a number (0.00 if absent).

5. BASE AMOUNT — The pre-tax, pre-charge subtotal.
   If not explicitly stated, derive as: total_amount - tax_amount - sum(additional_charges) + discount.

6. ADDITIONAL CHARGES — Separate fees (convenience fee, handling, surcharge, etc.) that are
   neither base fare nor taxes. Return as an array.

7. DISCOUNT — Any discount or coupon deduction. Return 0.00 if absent.

8. GRAND TOTAL — The final amount paid. Must match the figure on the receipt exactly.

9. LINE ITEMS — Individual purchased items/services with their amounts.

10. PAYMENT METHOD — Card type, UPI, Cash, etc. Return null if not mentioned.

Return ONLY this JSON (no extra text):
{{
  "merchant":          "exact company name",
  "invoice_number":    "reference or null",
  "date":              "YYYY-MM-DD",
  "currency":          "INR",
  "base_amount":       0.00,
  "tax_amount":        0.00,
  "tax_breakdown":     {{"cgst": 0.00, "sgst": 0.00, "igst": 0.00, "gst": 0.00, "vat": 0.00, "airport_tax": 0.00, "service_tax": 0.00}},
  "additional_charges": [],
  "discount":          0.00,
  "total_amount":      0.00,
  "line_items":        [{{"description": "item", "amount": 0.00}}],
  "payment_method":    null,
  "raw_text":          "..."
}}"""

    try:
        from groq import Groq  # pyrefly: ignore [missing-import]

        client  = Groq(api_key=groq_key)
        models  = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        last_err = None

        for model_name in models:
            try:
                resp   = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.05,
                    max_tokens=1200,
                )
                output = resp.choices[0].message.content
                # Strip any non-ASCII chars from Groq output before logging
                # (the LLM sometimes outputs Unicode arrows in explanatory text)
                output_safe = output.encode("ascii", errors="replace").decode("ascii")
                safe_log(f"[Groq/{model_name}] raw output:\n{output_safe[:600]}")
                parsed = extract_json_from_text(output)

                # ── Post-processing pipeline ─────────────────────────────────
                # 1. Merchant cleanup
                if parsed.get("merchant"):
                    parsed["merchant"] = sanitize_merchant(str(parsed["merchant"]))

                # 2. Enforce strict tax rules
                parsed = enforce_tax(parsed, raw_text)

                # 3. Reclassify if LLM merged all into base
                parsed = split_components_from_line_items(parsed)

                # 4. Validate amounts
                parsed = validate_amounts(parsed)

                # 4.5 Correct travel date: for airline/hotel docs prefer Flight/Travel Date over Invoice Date
                parsed = correct_travel_date(parsed, raw_text)

                # 5. Ensure every canonical field exists
                base = empty_result()
                base.update(parsed)
                if not base.get("raw_text") or base["raw_text"] in ("full raw text", "..."):
                    base["raw_text"] = raw_text

                print(f"[Result] merchant={base.get('merchant')} "
                      f"base={base.get('base_amount')} "
                      f"tax={base.get('tax_amount')} "
                      f"total={base.get('total_amount')}")
                return base

            except Exception as e:
                last_err = e
                print(f"[Groq/{model_name}] failed: {e}")
                continue

        raise HTTPException(
            status_code=503,
            detail=f"All models failed. Last error: {str(last_err)}",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")
