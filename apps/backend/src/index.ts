import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import aiRoutes from './routes/aiRoutes';
import ocrRoutes from './routes/ocrRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';

dotenv.config();

console.log("PORT =", process.env.PORT);
console.log("GEMINI =", process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/reconciliation', reconciliationRoutes);

app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', service: 'finpilot-api' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
