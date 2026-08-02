import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
    getTransactions,
    createTransaction,
    bulkCreateTransactions,
    updateTransaction,
    deleteTransaction,
    getAnalytics,
} from '../controllers/transactionController';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/').get(getTransactions).post(createTransaction);
router.post('/bulk', bulkCreateTransactions);
router.get('/analytics', getAnalytics);
router.route('/:id').put(updateTransaction).delete(deleteTransaction);

export default router;
