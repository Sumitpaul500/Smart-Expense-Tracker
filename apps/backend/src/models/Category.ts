import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    userId?: mongoose.Types.ObjectId;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
}

const categorySchema = new Schema<ICategory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String, required: true },
        icon: { type: String, required: true },
        color: { type: String, required: true },
        type: { type: String, enum: ['income', 'expense'], required: true },
    },
    { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
