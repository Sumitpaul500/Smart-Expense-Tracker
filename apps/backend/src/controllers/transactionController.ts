import { Response } from 'express';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { AuthRequest } from '../middlewares/authMiddleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function startOfLastMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
function endOfLastMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}
function startOfWeek(date: Date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

// ─── GET /api/v1/transactions ─────────────────────────────────────────────────
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const page  = parseInt(req.query.page  as string) || 1;
        const skip  = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            Transaction.find({ userId: req.user?._id })
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .populate('categoryId', 'name icon color'),
            Transaction.countDocuments({ userId: req.user?._id }),
        ]);

        res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── POST /api/v1/transactions ────────────────────────────────────────────────
export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { type, amount, currency, date, categoryId, merchant, location, tags, isRecurring } = req.body;

        const transaction = await Transaction.create({
            userId: req.user?._id,
            type,
            amount,
            currency,
            date,
            categoryId,
            merchant,
            location,
            tags,
            isRecurring,
        });

        res.status(201).json(transaction);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── POST /api/v1/transactions/bulk ──────────────────────────────────────────
export const bulkCreateTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Array of transaction items is required' });
        }

        const userId = req.user?._id;
        const docs = items.map((item: any) => ({
            userId,
            type: item.type || 'expense',
            amount: Number(item.amount),
            currency: item.currency || 'INR',
            date: item.date ? new Date(item.date) : new Date(),
            categoryId: item.categoryId || undefined,
            merchant: item.merchant || 'Bulk Transaction',
            tags: item.tags || ['bulk-import'],
            isRecurring: Boolean(item.isRecurring),
        }));

        const created = await Transaction.insertMany(docs);
        res.status(201).json({ count: created.length, transactions: created });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── PUT /api/v1/transactions/:id ────────────────────────────────────────────
export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        if (transaction.userId.toString() !== req.user?._id.toString())
            return res.status(401).json({ message: 'Not authorized' });

        const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── DELETE /api/v1/transactions/:id ─────────────────────────────────────────
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        if (transaction.userId.toString() !== req.user?._id.toString())
            return res.status(401).json({ message: 'Not authorized' });

        await transaction.deleteOne();
        res.json({ message: 'Transaction removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── GET /api/v1/transactions/analytics ──────────────────────────────────────
export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const { currency, categoryId, startDate, endDate } = req.query;

        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const lastMonthStart = startOfLastMonth(now);
        const lastMonthEnd   = endOfLastMonth(now);
        const thisWeekStart  = startOfWeek(now);

        // ── 0. Base Filters ──────────────────────────────────────────────────
        const baseMatch: any = { userId };
        if (currency) {
            baseMatch.currency = currency;
        }
        if (categoryId) {
            baseMatch.categoryId = new mongoose.Types.ObjectId(categoryId as string);
        }
        if (startDate || endDate) {
            baseMatch.date = {};
            if (startDate) baseMatch.date.$gte = new Date(startDate as string);
            if (endDate) baseMatch.date.$lte = new Date(endDate as string);
        }

        const buildRelativeMatch = (dateQuery: any) => {
            const match = { ...baseMatch };
            if (dateQuery) {
                if (match.date) {
                    match.date = { $and: [match.date, dateQuery] };
                } else {
                    match.date = dateQuery;
                }
            }
            return match;
        };

        // ── 1. All-time totals with filters ──────────────────────────────────
        const totals = await Transaction.aggregate([
            { $match: baseMatch },
            { $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            }},
        ]);

        const totalsMap: Record<string, number> = {};
        const countsMap: Record<string, number> = {};
        for (const t of totals) {
            totalsMap[t._id] = t.total;
            countsMap[t._id] = t.count;
        }
        const totalIncome   = totalsMap['income']   ?? 0;
        const totalExpenses = totalsMap['expense']  ?? 0;
        const totalBalance  = totalIncome - totalExpenses;
        const totalSavings  = totalBalance > 0 ? totalBalance : 0;

        // ── 2. This month ────────────────────────────────────────────────────
        const thisMonth = await Transaction.aggregate([
            { $match: buildRelativeMatch({ $gte: thisMonthStart }) },
            { $group: {
                _id: '$type',
                total: { $sum: '$amount' },
            }},
        ]);
        const thisMonthMap: Record<string, number> = {};
        for (const t of thisMonth) thisMonthMap[t._id] = t.total;
        const thisMonthIncome   = thisMonthMap['income']  ?? 0;
        const thisMonthExpenses = thisMonthMap['expense'] ?? 0;
        const thisMonthCashFlow = thisMonthIncome - thisMonthExpenses;

        // ── 3. Last month ────────────────────────────────────────────────────
        const lastMonth = await Transaction.aggregate([
            { $match: buildRelativeMatch({ $gte: lastMonthStart, $lte: lastMonthEnd }) },
            { $group: {
                _id: '$type',
                total: { $sum: '$amount' },
            }},
        ]);
        const lastMonthMap: Record<string, number> = {};
        for (const t of lastMonth) lastMonthMap[t._id] = t.total;
        const lastMonthIncome   = lastMonthMap['income']  ?? 0;
        const lastMonthExpenses = lastMonthMap['expense'] ?? 0;

        // ── 4. This week ─────────────────────────────────────────────────────
        const thisWeek = await Transaction.aggregate([
            { $match: buildRelativeMatch({ $gte: thisWeekStart }) },
            { $group: {
                _id: '$type',
                total: { $sum: '$amount' },
            }},
        ]);
        const thisWeekMap: Record<string, number> = {};
        for (const t of thisWeek) thisWeekMap[t._id] = t.total;
        const thisWeekIncome   = thisWeekMap['income']  ?? 0;
        const thisWeekExpenses = thisWeekMap['expense'] ?? 0;

        // ── 5. Spending by category (all-time/filtered) ─────────────────────
        // We use baseMatch to allow custom date range or currency filtering, defaulting to all-time
        const categoryMatch = { ...baseMatch, type: 'expense' };
        
        const categoryBreakdown = await Transaction.aggregate([
            { $match: categoryMatch },
            { $group: {
                _id: '$categoryId',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            }},
            { $sort: { total: -1 } },
            { $limit: 8 },
            { $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category',
            }},
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $project: {
                name:  { $ifNull: ['$category.name', 'Uncategorized'] },
                color: { $ifNull: ['$category.color', '#6366f1'] },
                icon:  { $ifNull: ['$category.icon', '💳'] },
                total: 1,
                count: 1,
            }},
        ]);

        // ── 6. Monthly trend (last 12 months) ────────────────────────────────
        const monthlyMatch = { ...baseMatch };
        if (!monthlyMatch.date) {
            const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            monthlyMatch.date = { $gte: twelveMonthsAgo };
        }

        const monthlyTrend = await Transaction.aggregate([
            { $match: monthlyMatch },
            { $group: {
                _id: {
                    year:  { $year: '$date' },
                    month: { $month: '$date' },
                    type:  '$type',
                },
                total: { $sum: '$amount' },
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Pivot monthly trend into pre-populated chronological 12-month objects
        const monthMap: Record<string, { month: string; income: number; expenses: number }> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthMap[key] = {
                month: d.toLocaleString('en-US', { month: 'short' }),
                income: 0,
                expenses: 0,
            };
        }

        for (const row of monthlyTrend) {
            const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
            if (!monthMap[key]) {
                monthMap[key] = {
                    month: new Date(row._id.year, row._id.month - 1).toLocaleString('en-US', { month: 'short' }),
                    income: 0,
                    expenses: 0,
                };
            }
            if (row._id.type === 'income')  monthMap[key].income   = row.total;
            if (row._id.type === 'expense') monthMap[key].expenses = row.total;
        }
        const monthlyTrendFormatted = Object.values(monthMap);

        // ── 7. Weekly trend (last 4 weeks) ───────────────────────────────────
        const weeklyMatch = { ...baseMatch };
        if (!weeklyMatch.date) {
            const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
            weeklyMatch.date = { $gte: fourWeeksAgo };
        }

        const weeklyTrend = await Transaction.aggregate([
            { $match: weeklyMatch },
            { $group: {
                _id: {
                    week: { $week: '$date' },
                    type: '$type',
                },
                total: { $sum: '$amount' },
            }},
            { $sort: { '_id.week': 1 } },
        ]);

        // Pre-populate chronological week list
        const weekMap: Record<number, { week: string; income: number; expenses: number }> = {};
        for (let i = 3; i >= 0; i--) {
            const tempDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const startOfYear = new Date(tempDate.getFullYear(), 0, 1);
            const pastDaysOfYear = (tempDate.getTime() - startOfYear.getTime()) / 86400000;
            const startOfYearDay = startOfYear.getDay();
            const w = Math.floor((pastDaysOfYear + startOfYearDay) / 7);
            weekMap[w] = { week: `W${w}`, income: 0, expenses: 0 };
        }

        for (const row of weeklyTrend) {
            const w = row._id.week;
            if (!weekMap[w]) {
                weekMap[w] = { week: `W${w}`, income: 0, expenses: 0 };
            }
            if (row._id.type === 'income')  weekMap[w].income   = row.total;
            if (row._id.type === 'expense') weekMap[w].expenses = row.total;
        }
        const weeklyTrendFormatted = Object.values(weekMap);

        // ── 8. Recent transactions ────────────────────────────────────────────
        const recentTransactions = await Transaction.find(baseMatch)
            .sort({ date: -1 })
            .limit(5)
            .populate('categoryId', 'name icon color')
            .lean();

        // ── 9. Financial health score (0-100) ────────────────────────────────
        let healthScore = 0;
        if (totalBalance > 0) healthScore += 30;
        if (totalIncome > 0 && totalExpenses / totalIncome < 0.7) healthScore += 25;
        if (totalSavings > 0) healthScore += 20;
        if ((countsMap['income'] ?? 0) > 0) healthScore += 15;
        if (thisMonthCashFlow > 0) healthScore += 10;
        healthScore = Math.min(100, healthScore);

        res.json({
            totalBalance,
            totalIncome,
            totalExpenses,
            totalSavings,
            thisMonth: {
                income:   thisMonthIncome,
                expenses: thisMonthExpenses,
                cashFlow: thisMonthCashFlow,
            },
            lastMonth: {
                income:   lastMonthIncome,
                expenses: lastMonthExpenses,
            },
            thisWeek: {
                income:   thisWeekIncome,
                expenses: thisWeekExpenses,
            },
            categoryBreakdown,
            monthlyTrend: monthlyTrendFormatted,
            weeklyTrend:  weeklyTrendFormatted,
            recentTransactions,
            healthScore,
            transactionCount: (countsMap['income'] ?? 0) + (countsMap['expense'] ?? 0),
        });
    } catch (error: any) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: error.message });
    }
};
