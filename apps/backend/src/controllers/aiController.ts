import { Response } from 'express';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Transaction } from '../models/Transaction';

export const chatWithAi = async (req: AuthRequest, res: Response) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
        const GROQ_KEY = process.env.GROQ_API_KEY || '';

        // Gemini keys start with "AIza" — anything else is invalid
        const hasGeminiKey = GEMINI_KEY && GEMINI_KEY.startsWith('AIza');
        const hasGroqKey = GROQ_KEY && !GROQ_KEY.includes('YOUR_') && GROQ_KEY.length > 20;

        const systemPrompt = `You are FinPilot AI, a friendly, ultra-clear personal finance advisor for everyday users in India.
${context ? `User's financial data: ${context}` : ''}

CRITICAL FORMATTING INSTRUCTIONS:
1. Start with 1 friendly, encouraging sentence answering the prompt directly.
2. Provide 3-4 practical, actionable tips as bullet points.
   - Each bullet point MUST start on a new line with "- **Bold Title:** ".
   - Separate every bullet point with a blank line.
3. Add a section header "### Action Steps" on its own line.
4. List exactly 2 quick numbered action steps (1. and 2.) on separate lines.
5. Always use ₹ for currency (e.g. ₹2,000, ₹100).
6. Use clear double line breaks between paragraphs and sections. Never bundle bullet points together into one paragraph.`;

        // 1. Try Gemini API first (only if key format is valid)
        if (hasGeminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const promptText = `${systemPrompt}\n\nUser Question: ${message}`;

                const result = await model.generateContent(promptText);
                const reply = result.response.text();
                if (reply) {
                    console.log('[AI Controller] Responded using Gemini 1.5 Flash');
                    return res.json({ reply });
                }
            } catch (geminiErr: any) {
                console.warn('[AI Controller] Gemini failed, trying Groq:', geminiErr.message);
            }
        }

        // 2. Try Groq API — currently available free-tier models
        if (hasGroqKey) {
            try {
                const groq = new Groq({ apiKey: GROQ_KEY });
                // These are confirmed available models as of mid-2025
                const models = [
                    'qwen/qwen3.8-27b',
                    'openai/gpt-oss-120b',
                    'openai/gpt-oss-20b',
                ];

                for (const model of models) {
                    try {
                        const completion = await groq.chat.completions.create({
                            model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: message },
                            ],
                            temperature: 0.5,
                            max_tokens: 600,
                        });

                        const reply = completion.choices[0]?.message?.content ?? '';
                        if (reply) {
                            console.log(`[AI Controller] Responded using Groq model: ${model}`);
                            return res.json({ reply });
                        }
                    } catch (err: any) {
                        console.warn(`[AI Controller] Groq model ${model} failed:`, err.message);
                    }
                }
            } catch (groqErr: any) {
                console.warn('[AI Controller] Groq API failed, using offline fallback:', groqErr.message);
            }
        }

        // 3. Intelligent Offline Smart Fallback — fetch real user stats
        let statsMsg = '';
        let txs: any[] = [];
        if (req.user?._id) {
            try {
                txs = await Transaction.find({ userId: req.user._id }).lean();
                const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                const balance = totalIncome - totalExpense;
                statsMsg = `\n\n📊 **Your ledger**: Income ₹${totalIncome.toLocaleString('en-IN')} | Expenses ₹${totalExpense.toLocaleString('en-IN')} | Balance ₹${balance.toLocaleString('en-IN')}`;
            } catch (_) { /* ignore */ }
        }

        const lowerMsg = message.toLowerCase();
        let reply = '';

        if (lowerMsg.includes('offline') || lowerMsg.includes('why offline') || lowerMsg.includes('why not working')) {
            reply = `FinPilot AI runs in cloud-AI mode by default (Gemini/Groq). When the API key is invalid, expired, or rate-limited it switches to intelligent local rules. To restore full AI, add a valid \`GEMINI_API_KEY\` (starting with "AIza") or a working \`GROQ_API_KEY\` in your backend .env.`;

        } else if (lowerMsg.includes('how are you') || lowerMsg.includes('how r u')) {
            reply = `I'm doing great, thank you! Ready to help you budget smarter and save more.${statsMsg} How can I assist?`;

        } else if (lowerMsg.match(/^(hello|hi|hey|good\s*(morning|evening|afternoon|night))/)) {
            reply = `Hello! I'm FinPilot AI, your personal finance advisor.${statsMsg} How can I help you today?`;

        } else if (lowerMsg.includes('abnormal') || lowerMsg.includes('unusual') || lowerMsg.includes('anomal') || lowerMsg.includes('spike') || lowerMsg.includes('high expense')) {
            // Detect abnormal expenses from real data
            if (txs.length > 0) {
                const expenses = txs.filter(t => t.type === 'expense');
                if (expenses.length > 0) {
                    const avg = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length;
                    const threshold = avg * 2;
                    const abnormal = expenses
                        .filter(t => t.amount > threshold)
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 5);

                    if (abnormal.length > 0) {
                        const list = abnormal.map(t =>
                            `• **${t.merchant || t.description || 'Transaction'}** — ₹${t.amount.toLocaleString('en-IN')} (${new Date(t.date).toLocaleDateString('en-IN')})`
                        ).join('\n');
                        reply = `🚨 **Detected ${abnormal.length} unusually high expense(s)** (above 2× your average of ₹${Math.round(avg).toLocaleString('en-IN')}):\n\n${list}\n\nReview these to ensure they were intentional.`;
                    } else {
                        reply = `✅ No abnormal expenses detected! Your spending looks consistent. Your average transaction is ₹${Math.round(avg).toLocaleString('en-IN')}.${statsMsg}`;
                    }
                } else {
                    reply = `No expense transactions found yet to analyze for anomalies.${statsMsg}`;
                }
            } else {
                reply = `No transaction data found yet. Add some transactions first and I'll scan for unusual spending patterns.`;
            }

        } else if (lowerMsg.includes('analyz') || lowerMsg.includes('habit') || lowerMsg.includes('pattern') || lowerMsg.includes('where') && lowerMsg.includes('cut')) {
            // Spending analysis from real data
            if (txs.length > 0) {
                const expenses = txs.filter(t => t.type === 'expense');
                const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
                const topByMerchant: Record<string, number> = {};
                expenses.forEach(t => {
                    const key = t.merchant || t.description || 'Other';
                    topByMerchant[key] = (topByMerchant[key] || 0) + t.amount;
                });
                const sorted = Object.entries(topByMerchant).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const list = sorted.map(([name, amt]) =>
                    `• **${name}** — ₹${amt.toLocaleString('en-IN')} (${totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0}% of total)`
                ).join('\n');
                reply = `📊 **Your top spending areas** (from ${expenses.length} expense transactions):\n\n${list}${statsMsg}\n\n💡 Focus on reducing your top 1–2 categories for maximum savings impact.`;
            } else {
                reply = `No expense data yet to analyze. Start tracking your transactions and I'll provide detailed spending habit insights.`;
            }

        } else if (lowerMsg.includes('save') || lowerMsg.includes('saving') || lowerMsg.includes('cut cost') || lowerMsg.includes('reduce spending')) {
            reply = `💰 **4 actionable ways to save more:${statsMsg}**\n\n1. **50/30/20 Rule** — 50% Needs, 30% Wants, 20% directly to Savings.\n2. **Audit Subscriptions** — Cancel unused OTT, gym, or SaaS plans.\n3. **30-Day Rule** — Wait 30 days before non-essential purchases.\n4. **Automate Savings** — Set up auto-debit on salary day to a liquid fund or savings account.`;

        } else if (lowerMsg.includes('rule') || lowerMsg.includes('3 rule') || lowerMsg.includes('actionable') || lowerMsg.includes('smart budget') || lowerMsg.includes('financial rule')) {
            reply = `🎯 **3 Rules for Smart Financial Health:**\n\n**Rule 1 — Pay Yourself First:** Transfer 15–20% of income to savings the moment your salary arrives, before spending.\n\n**Rule 2 — Emergency Fund:** Keep 3–6 months of expenses liquid (in a savings account or liquid mutual fund) before investing elsewhere.\n\n**Rule 3 — Zero-Based Budgeting:** Every rupee of income gets assigned a purpose (expenses + savings + investments = income). No unaccounted spending.${statsMsg}`;

        } else if (lowerMsg.includes('spend') || lowerMsg.includes('expense') || lowerMsg.includes('cost')) {
            reply = `Regularly reviewing expenses maintains financial health!${statsMsg}\n\n💡 Categorize spending into: **Food & Groceries**, **Housing & Utilities**, **Transport**, **Entertainment**, and **Subscriptions** to find leaks quickly.`;

        } else if (lowerMsg.includes('budget')) {
            reply = `A solid budget starts with tracking every transaction.${statsMsg}\n\nDivide income into:\n- **Fixed Expenses** (rent, EMI, utilities)\n- **Variable Expenses** (groceries, dining, leisure)\n- **Emergency Reserve** (10% minimum)\n- **Investment/Savings** (15–20%)`;

        } else if (lowerMsg.includes('invest') || lowerMsg.includes('sip') || lowerMsg.includes('mutual fund') || lowerMsg.includes('stock')) {
            reply = `📈 **Smart investing for Indian users:${statsMsg}**\n\n- Build 3–6 month emergency fund first\n- Start SIPs in Nifty 50 / Flexi-cap Index Funds (low cost)\n- Use **PPF** or **ELSS** for Section 80C tax savings (up to ₹1.5L/yr)\n- Avoid lump-sum investing — use STP for large amounts`;

        } else if (lowerMsg.includes('income') || lowerMsg.includes('earn') || lowerMsg.includes('salary')) {
            const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            reply = `💼 **Income overview:**${statsMsg}\n\nYou have recorded **₹${totalIncome.toLocaleString('en-IN')}** in total income. Consider diversifying with freelance income, dividend stocks, or rental income to reduce dependency on a single source.`;

        } else {
            reply = `I'm **FinPilot AI**, your financial co-pilot!${statsMsg}\n\nYou can ask me about:\n• **Spending analysis** — where your money goes\n• **Savings tips** — how to save more in INR\n• **Anomaly detection** — unusual expense alerts\n• **Budgeting rules** — smart financial frameworks\n• **Investment guidance** — SIPs, PPF, ELSS\n\nWhat would you like to explore?`;
        }

        console.log('[AI Controller] Responded using intelligent offline fallback');
        return res.json({ reply });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ message: error.message || 'Failed to process AI request' });
    }
};
