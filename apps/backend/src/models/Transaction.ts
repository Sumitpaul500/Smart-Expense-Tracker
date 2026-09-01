import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    currency: string;
    date: Date;
    categoryId?: mongoose.Types.ObjectId;
    merchant: string;
    location?: {
        lat: number;
        lng: number;
        address: string;
    };
    receiptId?: mongoose.Types.ObjectId;
    tags: string[];
    isRecurring: boolean;
    aiInsights?: {
        anomalyScore: number;
        autoCategorized: boolean;
    };
    status: 'cleared' | 'pending';
    baseAmount?: number;
    taxAmount?: number;
    taxBreakdown?: Record<string, number>;
    additionalCharges?: Array<{ description: string; amount: number }>;
    totalAmount?: number;
}

const transactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        date: { type: Date, required: true, default: Date.now, index: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
        merchant: { type: String, required: true },
        location: {
            lat: { type: Number },
            lng: { type: Number },
            address: { type: String },
        },
        receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt' },
        tags: [{ type: String }],
        isRecurring: { type: Boolean, default: false },
        aiInsights: {
            anomalyScore: { type: Number, default: 0 },
            autoCategorized: { type: Boolean, default: false },
        },
        status: { type: String, enum: ['cleared', 'pending'], default: 'cleared' },
        baseAmount: { type: Number },
        taxAmount: { type: Number },
        taxBreakdown: { type: Schema.Types.Mixed },
        additionalCharges: [
            {
                description: { type: String },
                amount: { type: Number }
            }
        ],
        totalAmount: { type: Number },
    },
    { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
