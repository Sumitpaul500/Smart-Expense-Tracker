import mongoose, { Document, Schema } from 'mongoose';

export interface IReconciliationLog extends Document {
    userId?: mongoose.Types.ObjectId;
    transactionId?: mongoose.Types.ObjectId;
    txCode: string;
    merchant: string;
    bankAmount: number;
    receiptAmount?: number;
    ledgerAmount?: number;
    currency: string;
    source: string;
    receiptRef?: string;
    status: 'MATCHED' | 'MISMATCH' | 'SUSPICIOUS';
    confidence: number;
    difference: number;
    reason: string;
    action: string;
    auditTrailStatus: 'Automatically approved' | 'Requires Review' | 'Flagged for Audit';
    date: Date;
}

const reconciliationLogSchema = new Schema<IReconciliationLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
        txCode: { type: String, required: true },
        merchant: { type: String, required: true },
        bankAmount: { type: Number, required: true },
        receiptAmount: { type: Number },
        ledgerAmount: { type: Number },
        currency: { type: String, default: 'INR' },
        source: { type: String, default: 'Bank SMS' },
        receiptRef: { type: String },
        status: { type: String, enum: ['MATCHED', 'MISMATCH', 'SUSPICIOUS'], required: true },
        confidence: { type: Number, required: true },
        difference: { type: Number, default: 0 },
        reason: { type: String, required: true },
        action: { type: String, required: true },
        auditTrailStatus: {
            type: String,
            enum: ['Automatically approved', 'Requires Review', 'Flagged for Audit'],
            default: 'Automatically approved',
        },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const ReconciliationLog = mongoose.model<IReconciliationLog>('ReconciliationLog', reconciliationLogSchema);
