import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
    userId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    period: 'monthly' | 'weekly' | 'yearly';
    limitAmount: number;
    startDate: Date;
    endDate: Date;
    alerts: {
        threshold: number;
        triggered: boolean;
    };
}

const budgetSchema = new Schema<IBudget>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        period: { type: String, enum: ['monthly', 'weekly', 'yearly'], default: 'monthly', required: true },
        limitAmount: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        alerts: {
            threshold: { type: Number, default: 0.8 },
            triggered: { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
