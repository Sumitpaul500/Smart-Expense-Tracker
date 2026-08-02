import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    googleId?: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    financialHealthScore: number;
    preferences: {
        currency: string;
        theme: string;
        language: string;
    };
    role: string;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: false },
        googleId: { type: String },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        profileImage: { type: String },
        financialHealthScore: { type: Number, default: 50 },
        preferences: {
            currency: { type: String, default: 'USD' },
            theme: { type: String, default: 'dark' },
            language: { type: String, default: 'en' },
        },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
