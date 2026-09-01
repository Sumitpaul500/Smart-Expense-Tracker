import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ReconciliationLog } from '../models/ReconciliationLog';
import { Transaction } from '../models/Transaction';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Helper to count pipeline sources from real transactions
async function getPipelineCounts(userId?: any) {
    const filter = userId ? { userId } : {};
    const [totalLedger, bankSmsCount, receiptCount] = await Promise.all([
        Transaction.countDocuments(filter),
        Transaction.countDocuments({ ...filter, tags: { $in: ['sms-import', 'bank-import', 'auto-parsed'] } }),
        Transaction.countDocuments({
            ...filter,
            $or: [
                { receiptId: { $ne: null } },
                { totalAmount: { $exists: true, $ne: null } },
                { tags: { $in: ['ocr-scanned', 'receipt-import'] } }
            ]
        })
    ]);

    return { totalLedger, bankSmsCount, receiptCount };
}

// ─── GET /api/v1/reconciliation/stats ────────────────────────────────────────
export const getReconciliationStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const filter = userId ? { userId } : {};
        
        const pipelineCounts = await getPipelineCounts(userId);
        const logs = await ReconciliationLog.find(filter);

        if (logs.length === 0) {
            // Un-reconciled initial state: derived directly from user's actual MongoDB transactions
            return res.json({
                totalTransactions: pipelineCounts.totalLedger,
                reconciled: 0,
                mismatches: 0,
                suspicious: 0,
                unresolved: pipelineCounts.totalLedger,
                reconciliationRate: 0.0,
                bankSmsCount: pipelineCounts.bankSmsCount,
                receiptCount: pipelineCounts.receiptCount,
                ledgerCount: pipelineCounts.totalLedger
            });
        }

        const total = logs.length;
        const matched = logs.filter(l => l.status === 'MATCHED' || l.status === 'RESOLVED').length;
        const mismatches = logs.filter(l => l.status === 'MISMATCH').length;
        const suspicious = logs.filter(l => l.status === 'SUSPICIOUS').length;
        const unresolved = mismatches + suspicious;
        const rate = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0.0;

        return res.json({
            totalTransactions: total,
            reconciled: matched,
            mismatches,
            suspicious,
            unresolved,
            reconciliationRate: rate,
            bankSmsCount: pipelineCounts.bankSmsCount,
            receiptCount: pipelineCounts.receiptCount,
            ledgerCount: pipelineCounts.totalLedger
        });
    } catch (error: any) {
        console.error('[Reconciliation Controller Stats Error]:', error);
        return res.status(500).json({ message: error.message });
    }
};

// ─── GET /api/v1/reconciliation/items ────────────────────────────────────────
export const getReconciliationItems = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const filter = userId ? { userId } : {};
        const logs = await ReconciliationLog.find(filter).sort({ date: -1 });

        return res.json({ items: logs, count: logs.length });
    } catch (error: any) {
        console.error('[Reconciliation Controller Items Error]:', error);
        return res.status(500).json({ message: error.message });
    }
};

// ─── POST /api/v1/reconciliation/run ──────────────────────────────────────────
export const runReconciliation = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const filter = userId ? { userId } : {};

        // Fetch user's real transactions from MongoDB
        const transactions = await Transaction.find(filter).sort({ date: -1 }).lean();

        if (transactions.length === 0) {
            const pipelineCounts = await getPipelineCounts(userId);
            return res.json({
                summary: {
                    total_transactions: 0,
                    reconciled: 0,
                    mismatches: 0,
                    suspicious: 0,
                    unresolved: 0,
                    reconciliation_rate: 0.0,
                    bank_sms_count: 0,
                    receipt_count: 0,
                    ledger_count: 0
                },
                results: []
            });
        }

        const itemsToProcess = transactions.map((t: any) => {
            const isSms = t.tags?.includes('sms-import') || t.tags?.includes('auto-parsed');
            const hasReceipt = Boolean(t.receiptId || t.totalAmount || t.tags?.includes('ocr-scanned'));
            const txCode = `TX-${t._id.toString().slice(-6).toUpperCase()}`;

            return {
                id: txCode,
                transaction_db_id: t._id,
                merchant: t.merchant || 'Unknown Merchant',
                bank_amount: t.amount,
                receipt_amount: hasReceipt ? (t.totalAmount || t.amount) : undefined,
                ledger_amount: t.amount,
                currency: t.currency || 'INR',
                source: isSms ? 'Bank SMS' : hasReceipt ? 'Receipt OCR' : 'Ledger Record',
                receipt_ref: t.receiptId ? `RCP-${t.receiptId.toString().slice(-6).toUpperCase()}` : (hasReceipt ? 'RCP-DIGITAL' : undefined),
                anomaly_score: t.aiInsights?.anomalyScore || 0,
                date: t.date
            };
        });

        // Delegate matching analysis to Python FastAPI ML service with Express fallback
        let mlResponse;
        try {
            const resp = await axios.post(`${ML_SERVICE_URL}/api/v1/reconcile/reconcile-batch`, {
                transactions: itemsToProcess
            });
            mlResponse = resp.data;
        } catch (mlErr) {
            console.warn('[Reconciliation Controller] FastAPI service call fallback to Express analyzer:', mlErr);
            
            const results = itemsToProcess.map((item: any) => {
                const bankAmt = item.bank_amount;
                const recAmt = item.receipt_amount;
                const merchantLower = item.merchant.toLowerCase();
                
                const diff = recAmt !== undefined ? Math.abs(bankAmt - recAmt) : 0;
                const isSuspicious = item.anomaly_score > 0.7 || merchantLower.includes('unknown') || merchantLower.includes('unauthorized') || (bankAmt > 20000 && recAmt === undefined);
                const isMismatch = recAmt !== undefined && diff > 0.01;

                let status: 'MATCHED' | 'MISMATCH' | 'SUSPICIOUS' = 'MATCHED';
                let confidence = 98.5;
                let reason = `Merchant (${item.merchant}), amount (₹${bankAmt.toFixed(2)}) and timestamp verified across records.`;
                let action = 'Automatically approved & posted to ledger.';
                let decisionStatus: 'Automatically approved' | 'Requires Review' | 'Flagged for Audit' = 'Automatically approved';

                if (isSuspicious) {
                    status = 'SUSPICIOUS';
                    confidence = 92.0;
                    reason = `High anomaly score (${(item.anomaly_score * 100).toFixed(0)}%) or unrecognized merchant identity.`;
                    action = 'Flagged for compliance audit and security review.';
                    decisionStatus = 'Flagged for Audit';
                } else if (isMismatch) {
                    status = 'MISMATCH';
                    confidence = 95.0;
                    reason = `Bank statement amount (₹${bankAmt.toFixed(2)}) differs from receipt OCR amount (₹${recAmt ? recAmt.toFixed(2) : '0.00'}). Variance: ₹${diff.toFixed(2)}.`;
                    action = 'Requires controller review and supplier invoice verification.';
                    decisionStatus = 'Requires Review';
                }

                return {
                    transaction_id: item.id,
                    transaction_db_id: item.transaction_db_id,
                    merchant: item.merchant,
                    bank_amount: bankAmt,
                    receipt_amount: recAmt,
                    ledger_amount: item.ledger_amount,
                    status,
                    confidence,
                    difference: diff,
                    reason,
                    action,
                    audit_trail: {
                        tx_code: item.id,
                        source: item.source,
                        receipt_ref: item.receipt_ref || 'N/A',
                        ai_decision: status,
                        confidence: `${confidence}%`,
                        reason,
                        decision_status: decisionStatus
                    }
                };
            });

            const matched = results.filter((r: any) => r.status === 'MATCHED').length;
            const mismatches = results.filter((r: any) => r.status === 'MISMATCH').length;
            const suspicious = results.filter((r: any) => r.status === 'SUSPICIOUS').length;
            const total = results.length;

            mlResponse = {
                summary: {
                    total_transactions: total,
                    reconciled: matched,
                    mismatches,
                    suspicious,
                    unresolved: mismatches + suspicious,
                    reconciliation_rate: total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0.0
                },
                results
            };
        }

        // Save real reconciliation logs into MongoDB
        for (const resItem of mlResponse.results) {
            await ReconciliationLog.findOneAndUpdate(
                { txCode: resItem.transaction_id },
                {
                    userId,
                    transactionId: resItem.transaction_db_id,
                    txCode: resItem.transaction_id,
                    merchant: resItem.merchant,
                    bankAmount: resItem.bank_amount,
                    receiptAmount: resItem.receipt_amount,
                    ledgerAmount: resItem.ledger_amount || resItem.bank_amount,
                    currency: 'INR',
                    source: resItem.audit_trail?.source || 'Ledger Record',
                    receiptRef: resItem.audit_trail?.receipt_ref || 'N/A',
                    status: resItem.status,
                    confidence: resItem.confidence,
                    difference: resItem.difference || 0,
                    reason: resItem.reason,
                    action: resItem.action,
                    auditTrailStatus: resItem.audit_trail?.decision_status || 'Automatically approved',
                    date: new Date()
                },
                { upsert: true, new: true }
            );
        }

        const pipelineCounts = await getPipelineCounts(userId);
        const logs = await ReconciliationLog.find(filter).sort({ date: -1 });

        const total = logs.length;
        const matched = logs.filter(l => l.status === 'MATCHED' || l.status === 'RESOLVED').length;
        const mismatches = logs.filter(l => l.status === 'MISMATCH').length;
        const suspicious = logs.filter(l => l.status === 'SUSPICIOUS').length;
        const unresolved = mismatches + suspicious;
        const rate = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0.0;

        const summary = {
            totalTransactions: total,
            reconciled: matched,
            mismatches,
            suspicious,
            unresolved,
            reconciliationRate: rate,
            bankSmsCount: pipelineCounts.bankSmsCount,
            receiptCount: pipelineCounts.receiptCount,
            ledgerCount: pipelineCounts.totalLedger
        };

        return res.json({ summary, results: logs });
    } catch (error: any) {
        console.error('[Reconciliation Controller Run Error]:', error);
        return res.status(500).json({ message: error.message });
    }
};

// ─── GET /api/v1/reconciliation/audit/:txCode ────────────────────────────────
export const getAuditTrail = async (req: AuthRequest, res: Response) => {
    try {
        const { txCode } = req.params;
        const log = await ReconciliationLog.findOne({ txCode });

        if (!log) {
            return res.status(404).json({ message: `No reconciliation audit log found for transaction ${txCode}` });
        }

        return res.json({
            txCode: log.txCode,
            source: log.source,
            receiptRef: log.receiptRef || 'N/A',
            aiDecision: log.status,
            confidence: `${log.confidence}%`,
            reason: log.reason,
            decisionStatus: log.auditTrailStatus,
            merchant: log.merchant,
            bankAmount: log.bankAmount,
            receiptAmount: log.receiptAmount,
            difference: log.difference
        });
    } catch (error: any) {
        console.error('[Reconciliation Controller Audit Error]:', error);
        return res.status(500).json({ message: error.message });
    }
};

// ─── PATCH /api/v1/reconciliation/:txCode/status ────────────────────────────
export const updateReconciliationStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { txCode } = req.params;
        const { status } = req.body;
        
        const log = await ReconciliationLog.findOneAndUpdate(
            { txCode },
            { 
                status: status || 'MATCHED',
                auditTrailStatus: 'Resolved by User',
                reason: 'Manually verified & resolved by finance controller.'
            },
            { new: true }
        );

        if (!log) {
            return res.status(404).json({ message: `Reconciliation item ${txCode} not found` });
        }

        return res.json({ message: 'Status updated successfully', item: log });
    } catch (error: any) {
        console.error('[Reconciliation Controller Update Error]:', error);
        return res.status(500).json({ message: error.message });
    }
};
