import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { uploadReceipt } from '../controllers/ocrController';
import multer from 'multer';

const router = express.Router();

// Use in-memory storage (no disk writes needed — we stream to ML service)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max (PDFs can be larger)
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, GIF images or PDF files are allowed'));
        }
    },
});


router.post('/parse-receipt', protect as any, upload.single('file'), uploadReceipt as any);

export default router;
