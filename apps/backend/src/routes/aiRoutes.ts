import express from 'express';
import { chatWithAi } from '../controllers/aiController';

const router = express.Router();

// AI chat is public — no auth needed so it works even when session resets
router.post('/chat', chatWithAi as any);

export default router;
