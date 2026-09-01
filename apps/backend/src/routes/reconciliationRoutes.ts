import express from 'express';
import {
    getReconciliationStats,
    getReconciliationItems,
    runReconciliation,
    getAuditTrail
} from '../controllers/reconciliationController';

const router = express.Router();

router.get('/stats', getReconciliationStats as any);
router.get('/items', getReconciliationItems as any);
router.post('/run', runReconciliation as any);
router.get('/audit/:txCode', getAuditTrail as any);

export default router;
