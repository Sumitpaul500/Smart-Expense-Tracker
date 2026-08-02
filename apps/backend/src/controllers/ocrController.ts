import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import FormData from 'form-data';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded. Please attach an image.' });
        }

        const { originalname, mimetype, buffer } = req.file;

        // Forward the image as multipart form data to the ML microservice
        const form = new FormData();
        form.append('file', buffer, { filename: originalname, contentType: mimetype });

        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/api/v1/ocr/parse-receipt`,
            form,
            { headers: form.getHeaders(), timeout: 30000 }
        );

        return res.json(mlResponse.data);
    } catch (error: any) {
        const msg = error?.response?.data?.detail ?? error.message ?? 'OCR processing failed';
        console.error('[OCR Controller]', msg);
        return res.status(500).json({ message: msg });
    }
};
