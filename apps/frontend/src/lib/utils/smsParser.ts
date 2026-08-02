export interface ParsedSmsTransaction {
	id: string;
	originalText: string;
	type: 'income' | 'expense' | 'transfer';
	amount: number;
	currency: string;
	merchant: string;
	date: string;
	confidence: 'high' | 'medium' | 'low';
}

/**
 * Parses raw text containing bank/UPI SMS notifications into structured transaction objects.
 */
export function parseSmsText(rawText: string, defaultCurrency = 'INR'): ParsedSmsTransaction[] {
	if (!rawText || !rawText.trim()) return [];

	// Split input into individual lines or SMS blocks
	const blocks = rawText
		.split(/\n{2,}|(?=Sent |Debited |Credited |Paid |Rs\.|INR |Dear SBI|A\/C |Alert:)/i)
		.map((b) => b.trim())
		.filter((b) => b.length > 10);

	const parsed: ParsedSmsTransaction[] = [];

	for (let i = 0; i < blocks.length; i++) {
		const text = blocks[i];
		const item = parseSingleSms(text, i, defaultCurrency);
		if (item) {
			parsed.push(item);
		}
	}

	return parsed;
}

function parseSingleSms(text: string, index: number, defaultCurrency: string): ParsedSmsTransaction | null {
	const lower = text.toLowerCase();

	// 1. Detect Type
	let type: 'income' | 'expense' | 'transfer' = 'expense';
	if (lower.includes('credited') || lower.includes('received') || lower.includes('refund') || lower.includes('cashback')) {
		type = 'income';
	} else if (lower.includes('transfer to') || lower.includes('sent to friend') || lower.includes('self transfer')) {
		type = 'transfer';
	} else if (lower.includes('debited') || lower.includes('sent') || lower.includes('paid') || lower.includes('spent') || lower.includes('withdrawn')) {
		type = 'expense';
	}

	// 2. Extract Amount & Currency
	let amount = 0;
	let currency = defaultCurrency;

	// Pattern for Rs / INR / $ / € / £
	const amountRegex = /(?:rs\.?|inr|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|\$|€|£)/i;
	const amtMatch = text.match(amountRegex);

	if (amtMatch) {
		const rawAmt = (amtMatch[1] || amtMatch[2]).replace(/,/g, '');
		amount = parseFloat(rawAmt);
	} else {
		// Fallback match numbers with decimals
		const numMatch = text.match(/([\d,]+\.\d{2})/);
		if (numMatch) {
			amount = parseFloat(numMatch[1].replace(/,/g, ''));
		}
	}

	if (!amount || isNaN(amount) || amount <= 0) {
		return null; // Skip non-transactional text
	}

	// Detect Currency symbol
	if (text.includes('$')) currency = 'USD';
	else if (text.includes('€')) currency = 'EUR';
	else if (text.includes('£')) currency = 'GBP';

	// 3. Extract Merchant / Beneficiary
	let merchant = 'Unknown Merchant';

	// Look for "to <Name>", "at <Name>", "vpa <Name>", "towards <Name>", "for <Name>", "info: <Name>"
	const merchantRegex = /(?:to|at|vpa|towards|for|info:)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?=\s+(?:on|via|ref|bal|using|a\/c|card|dt|\d{2}[-/.]|$))/i;
	const merchMatch = text.match(merchantRegex);

	if (merchMatch && merchMatch[1]) {
		let found = merchMatch[1].trim();
		// Clean common trailing noise
		found = found.replace(/\b(upi|neft|imps|ref|a\/c|val|dt)\b.*/i, '').trim();
		if (found.length > 1) {
			merchant = found;
		}
	} else {
		// Keyword backup matching
		if (lower.includes('swiggy')) merchant = 'Swiggy';
		else if (lower.includes('zomato')) merchant = 'Zomato';
		else if (lower.includes('uber')) merchant = 'Uber';
		else if (lower.includes('ola')) merchant = 'Ola Cabs';
		else if (lower.includes('amazon')) merchant = 'Amazon';
		else if (lower.includes('flipkart')) merchant = 'Flipkart';
		else if (lower.includes('netflix')) merchant = 'Netflix';
		else if (lower.includes('spotify')) merchant = 'Spotify';
		else if (lower.includes('salary')) merchant = 'Company Salary';
		else if (lower.includes('atm')) merchant = 'ATM Cash Withdrawal';
	}

	// 4. Extract Date
	let dateIso = new Date().toISOString();
	// Matches: 31-Jul-26, 31/07/2026, 31-07-26, 2026-07-31, 31Jul26
	const dateRegex = /\b(\d{1,2})[-/\s.]([A-Za-z]{3}|\d{1,2})[-/\s.](\d{2,4})\b|\b(\d{1,2})([A-Za-z]{3})(\d{2,4})\b/;
	const dateMatch = text.match(dateRegex);

	if (dateMatch) {
		try {
			const day = dateMatch[1] || dateMatch[4];
			const month = dateMatch[2] || dateMatch[5];
			const year = dateMatch[3] || dateMatch[6];
			
			const fullYear = year.length === 2 ? `20${year}` : year;
			const parsedDate = new Date(`${day} ${month} ${fullYear}`);
			if (!isNaN(parsedDate.getTime())) {
				dateIso = parsedDate.toISOString();
			}
		} catch {
			// keep current date fallback
		}
	}

	const confidence: 'high' | 'medium' | 'low' = merchMatch && amtMatch ? 'high' : amtMatch ? 'medium' : 'low';

	return {
		id: `parsed_${Date.now()}_${index}`,
		originalText: text,
		type,
		amount,
		currency,
		merchant,
		date: dateIso,
		confidence,
	};
}
