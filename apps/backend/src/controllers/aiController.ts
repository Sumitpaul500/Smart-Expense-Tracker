import { Response } from 'express';
import Groq from 'groq-sdk';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Transaction } from '../models/Transaction';

export const chatWithAi = async (req: AuthRequest, res: Response) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const GROQ_KEY = process.env.GROQ_API_KEY || '';
        const hasGroqKey = GROQ_KEY && GROQ_KEY !== 'YOUR_GROQ_API_KEY';

        if (hasGroqKey) {
            try {
                const groq = new Groq({ apiKey: GROQ_KEY });

                const systemPrompt = `You are FinPilot AI, a helpful and knowledgeable financial assistant for Indian users.
${context ? `Context about the user's finances: ${context}` : ''}
Provide concise, actionable financial advice. Use ₹ for Indian Rupees. Be professional and friendly.`;

                // Try primary model first, fallback to lighter model
                const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
                let lastError: any = null;

                for (const model of models) {
                    try {
                        const completion = await groq.chat.completions.create({
                            model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: message },
                            ],
                            temperature: 0.4,
                            max_tokens: 512,
                        });

                        const reply = completion.choices[0]?.message?.content ?? '';
                        console.log(`AI responded using Groq model: ${model}`);
                        return res.json({ reply });
                    } catch (err: any) {
                        const msg = (err?.message ?? '').toLowerCase();
                        if (msg.includes('rate') || msg.includes('429') || msg.includes('limit')) {
                            console.warn(`Groq model ${model} rate limited, trying next...`);
                            lastError = err;
                            continue;
                        }
                        throw err;
                    }
                }

                console.error('All Groq models failed:', lastError?.message);
            } catch (groqError: any) {
                console.warn('Groq API failed, using offline fallback:', groqError.message);
            }
        }

        // ── Offline smart fallback ──────────────────────────────────────────
        let statsMsg = '';
        if (req.user?._id) {
            try {
                const txs = await Transaction.find({ userId: req.user._id });
                const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                statsMsg = ` Based on your records: Income ₹${totalIncome.toLocaleString('en-IN')}, Expenses ₹${totalExpense.toLocaleString('en-IN')}, Balance ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}.`;
            } catch (_) { /* ignore */ }
        }

        const lowerMsg = message.toLowerCase();
        let mockReply = `I'm FinPilot AI running in offline mode.${statsMsg} How can I help with your finances today?`;

        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            mockReply = `Hello! I'm FinPilot AI, your personal finance assistant.${statsMsg} How can I help you today?`;
        } else if (lowerMsg.includes('spend') || lowerMsg.includes('expense')) {
            mockReply = `Reviewing your expenses is a great habit!${statsMsg} I recommend categorising your spending to identify where you can save.`;
        } else if (lowerMsg.includes('budget') || lowerMsg.includes('saving')) {
            mockReply = `The 50/30/20 rule works well: 50% on needs, 30% on wants, 20% on savings.${statsMsg}`;
        } else if (lowerMsg.includes('invest')) {
            mockReply = `For Indian investors, consider SIPs in index funds (Nifty 50), PPF for tax savings, and keeping 3–6 months of expenses as an emergency fund.${statsMsg}`;
        }

        return res.json({ reply: mockReply });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ message: error.message || 'Failed to process AI request' });
    }
};
