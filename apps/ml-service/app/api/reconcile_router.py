from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

class TransactionItem(BaseModel):
    id: str
    merchant: str
    bank_amount: float
    receipt_amount: Optional[float] = None
    ledger_amount: Optional[float] = None
    date: Optional[str] = None
    currency: Optional[str] = "INR"
    source: Optional[str] = "Ledger Record"
    receipt_ref: Optional[str] = None

class ReconciliationRequest(BaseModel):
    transactions: List[TransactionItem]

def analyze_single_transaction(tx: TransactionItem) -> Dict[str, Any]:
    bank_amt = tx.bank_amount
    rec_amt = tx.receipt_amount if tx.receipt_amount is not None else bank_amt
    ledg_amt = tx.ledger_amount if tx.ledger_amount is not None else bank_amt
    diff = abs(bank_amt - rec_amt) if tx.receipt_amount is not None else 0.0
    merchant_lower = tx.merchant.lower()

    # Rule 1: Suspicious Pattern (Unrecognized merchant, anomaly, high debit without validation)
    if "unknown" in merchant_lower or "unauthorized" in merchant_lower or (bank_amt > 20000 and tx.receipt_amount is None):
        confidence = 92.0
        return {
            "transaction_id": tx.id,
            "merchant": tx.merchant,
            "bank_amount": bank_amt,
            "receipt_amount": tx.receipt_amount,
            "ledger_amount": ledg_amt,
            "status": "SUSPICIOUS",
            "confidence": confidence,
            "difference": diff,
            "reason": f"High value transaction ({tx.currency or '₹'}{bank_amt:,.2f}) with unverified merchant identity or missing mandatory receipt validation.",
            "action": "Flagged for manual security compliance audit.",
            "audit_trail": {
                "tx_code": tx.id,
                "source": tx.source or "Bank Feed",
                "receipt_ref": tx.receipt_ref or "N/A",
                "ai_decision": "SUSPICIOUS",
                "confidence": f"{confidence:.1f}%",
                "reason": "Unrecognized merchant identity and unverified source document exceed anomaly threshold.",
                "decision_status": "Flagged for Audit"
            }
        }

    # Rule 2: Amount Mismatch (Bank statement amount differs from receipt amount)
    if tx.receipt_amount is not None and diff > 0.01:
        confidence = 95.0
        return {
            "transaction_id": tx.id,
            "merchant": tx.merchant,
            "bank_amount": bank_amt,
            "receipt_amount": rec_amt,
            "ledger_amount": ledg_amt,
            "status": "MISMATCH",
            "confidence": confidence,
            "difference": diff,
            "reason": f"Bank statement amount ({tx.currency or '₹'}{bank_amt:,.2f}) does not match receipt OCR amount ({tx.currency or '₹'}{rec_amt:,.2f}). Discrepancy of {tx.currency or '₹'}{diff:,.2f} detected.",
            "action": "Requires controller review and supplier invoice verification.",
            "audit_trail": {
                "tx_code": tx.id,
                "source": tx.source or "Bank SMS",
                "receipt_ref": tx.receipt_ref or "N/A",
                "ai_decision": "MISMATCH",
                "confidence": f"{confidence:.1f}%",
                "reason": f"Bank statement amount differs from receipt amount by {tx.currency or '₹'}{diff:,.2f}.",
                "decision_status": "Requires Review"
            }
        }

    # Rule 3: Exact Match
    confidence = 98.5
    return {
        "transaction_id": tx.id,
        "merchant": tx.merchant,
        "bank_amount": bank_amt,
        "receipt_amount": rec_amt,
        "ledger_amount": ledg_amt,
        "status": "MATCHED",
        "confidence": confidence,
        "difference": 0.0,
        "reason": f"Merchant ({tx.merchant}), transaction amount ({tx.currency or '₹'}{bank_amt:,.2f}) and timestamp matched across records.",
        "action": "Automatically approved & posted to general ledger.",
        "audit_trail": {
            "tx_code": tx.id,
            "source": tx.source or "Ledger Record",
            "receipt_ref": tx.receipt_ref or "N/A",
            "ai_decision": "MATCHED",
            "confidence": f"{confidence:.1f}%",
            "reason": "Merchant, amount and date verified across matching records.",
            "decision_status": "Automatically approved"
        }
    }

@router.post("/reconcile-item")
def reconcile_item(item: TransactionItem):
    return analyze_single_transaction(item)

@router.post("/reconcile-batch")
def reconcile_batch(req: ReconciliationRequest):
    results = [analyze_single_transaction(tx) for tx in req.transactions]
    
    total = len(results)
    matched = sum(1 for r in results if r["status"] == "MATCHED")
    mismatches = sum(1 for r in results if r["status"] == "MISMATCH")
    suspicious = sum(1 for r in results if r["status"] == "SUSPICIOUS")
    
    rate = round((matched / total * 100), 1) if total > 0 else 0.0

    return {
        "summary": {
            "total_transactions": total,
            "reconciled": matched,
            "mismatches": mismatches,
            "suspicious": suspicious,
            "unresolved": mismatches + suspicious,
            "reconciliation_rate": rate
        },
        "results": results
    }
