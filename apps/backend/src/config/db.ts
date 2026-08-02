import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI as string;
        try {
            const conn = await mongoose.connect(uri);
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        } catch (error: any) {
            console.warn(`Local MongoDB connection failed. Falling back to in-memory database...`);
            const mongoServer = await MongoMemoryServer.create();
            const memoryUri = mongoServer.getUri();
            const conn = await mongoose.connect(memoryUri);
            console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
        }
    } catch (error: any) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
