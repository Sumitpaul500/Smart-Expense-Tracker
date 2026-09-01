// Centralised API client — reads base URL from env, attaches JWT automatically
import { authState, clearAuth } from '$lib/stores/auth.svelte';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...extra,
	};
	if (authState.token) {
		headers['Authorization'] = `Bearer ${authState.token}`;
	}
	return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const body = await res.json().catch(() => ({ message: res.statusText }));
		if (res.status === 401) {
			clearAuth();
			if (typeof window !== 'undefined') {
				window.location.href = '/login';
			}
		}
		throw new Error(body.message ?? `HTTP ${res.status}`);
	}
	return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
	login: (email: string, password: string) =>
		fetch(`${BASE}/auth/login`, {
			method: 'POST',
			headers: getHeaders(),
			body: JSON.stringify({ email, password }),
		}).then((r) => handleResponse<AuthResponse>(r)),

	register: (data: RegisterPayload) =>
		fetch(`${BASE}/auth/register`, {
			method: 'POST',
			headers: getHeaders(),
			body: JSON.stringify(data),
		}).then((r) => handleResponse<AuthResponse>(r)),

	profile: () =>
		fetch(`${BASE}/auth/profile`, { headers: getHeaders() }).then((r) =>
			handleResponse<UserProfile>(r)
		),
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionApi = {
	list: (page = 1, limit = 50) =>
		fetch(`${BASE}/transactions?page=${page}&limit=${limit}`, {
			headers: getHeaders(),
		}).then((r) => handleResponse<TransactionListResponse>(r)),

	analytics: (params?: { currency?: string; categoryId?: string; startDate?: string; endDate?: string }) => {
		const q = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString() : '';
		return fetch(`${BASE}/transactions/analytics${q ? `?${q}` : ''}`, { headers: getHeaders() }).then((r) =>
			handleResponse<AnalyticsResponse>(r)
		);
	},

	create: (data: CreateTransactionPayload) =>
		fetch(`${BASE}/transactions`, {
			method: 'POST',
			headers: getHeaders(),
			body: JSON.stringify(data),
		}).then((r) => handleResponse<Transaction>(r)),

	bulkCreate: (items: CreateTransactionPayload[]) =>
		fetch(`${BASE}/transactions/bulk`, {
			method: 'POST',
			headers: getHeaders(),
			body: JSON.stringify({ items }),
		}).then((r) => handleResponse<{ count: number; transactions: Transaction[] }>(r)),

	update: (id: string, data: Partial<CreateTransactionPayload>) =>
		fetch(`${BASE}/transactions/${id}`, {
			method: 'PUT',
			headers: getHeaders(),
			body: JSON.stringify(data),
		}).then((r) => handleResponse<Transaction>(r)),

	delete: (id: string) =>
		fetch(`${BASE}/transactions/${id}`, {
			method: 'DELETE',
			headers: getHeaders(),
		}).then((r) => handleResponse<{ message: string }>(r)),
};

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export const aiApi = {
	chat: (message: string, context = '') =>
		fetch(`${BASE}/ai/chat`, {
			method: 'POST',
			headers: getHeaders(),
			body: JSON.stringify({ message, context }),
		}).then((r) => handleResponse<{ reply: string }>(r)),
};

// ─── OCR ──────────────────────────────────────────────────────────────────────
export const ocrApi = {
	parseReceipt: (file: File) => {
		const form = new FormData();
		form.append('file', file);
		// Omit Content-Type so browser sets the correct multipart boundary
		const headers: Record<string, string> = {};
		if (authState.token) {
			headers['Authorization'] = `Bearer ${authState.token}`;
		}
		return fetch(`${BASE}/ocr/parse-receipt`, {
			method: 'POST',
			headers,
			body: form,
		}).then((r) => handleResponse<OcrResult>(r));
	},
};

// ─── Reconciliation ───────────────────────────────────────────────────────────
export const reconciliationApi = {
	getStats: () =>
		fetch(`${BASE}/reconciliation/stats`, { headers: getHeaders() }).then((r) =>
			handleResponse<ReconciliationStats>(r)
		),

	getItems: () =>
		fetch(`${BASE}/reconciliation/items`, { headers: getHeaders() }).then((r) =>
			handleResponse<{ items: ReconciliationItem[]; count: number }>(r)
		),

	runReconciliation: () =>
		fetch(`${BASE}/reconciliation/run`, {
			method: 'POST',
			headers: getHeaders(),
		}).then((r) => handleResponse<{ summary: ReconciliationStats; results: any[] }>(r)),

	getAuditTrail: (txCode: string) =>
		fetch(`${BASE}/reconciliation/audit/${txCode}`, { headers: getHeaders() }).then((r) =>
			handleResponse<AuditTrailRecord>(r)
		),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthResponse {
	_id: string;
	email: string;
	firstName: string;
	lastName: string;
	token: string;
}

export interface UserProfile {
	_id: string;
	email: string;
	firstName: string;
	lastName: string;
}

export interface RegisterPayload {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

export interface Transaction {
	_id: string;
	type: 'income' | 'expense' | 'transfer';
	amount: number;
	currency: string;
	date: string;
	merchant: string;
	categoryId?: { _id: string; name: string; icon: string; color: string } | null;
	tags: string[];
	isRecurring: boolean;
	status: 'cleared' | 'pending';
}

export interface TransactionListResponse {
	transactions: Transaction[];
	total: number;
	page: number;
	pages: number;
}

export interface CategoryBreakdown {
	_id: string | null;
	name: string;
	color: string;
	icon: string;
	total: number;
	count: number;
}

export interface TrendPoint {
	month?: string;
	week?: string;
	income: number;
	expenses: number;
}

export interface AnalyticsResponse {
	totalBalance: number;
	totalIncome: number;
	totalExpenses: number;
	totalSavings: number;
	thisMonth: { income: number; expenses: number; cashFlow: number };
	lastMonth: { income: number; expenses: number };
	thisWeek: { income: number; expenses: number };
	categoryBreakdown: CategoryBreakdown[];
	monthlyTrend: TrendPoint[];
	weeklyTrend: TrendPoint[];
	recentTransactions: Transaction[];
	healthScore: number;
	transactionCount: number;
}

export interface CreateTransactionPayload {
	type: 'income' | 'expense' | 'transfer';
	amount: number;
	currency?: string;
	date: string;
	merchant: string;
	categoryId?: string;
	tags?: string[];
	isRecurring?: boolean;
	baseAmount?: number;
	taxAmount?: number;
	taxBreakdown?: Record<string, number>;
	additionalCharges?: Array<{ description: string; amount: number }>;
	totalAmount?: number;
}

export interface OcrLineItem {
	description: string;
	amount: number;
}

export interface OcrResult {
	merchant: string | null;
	invoice_number?: string | null;
	date: string | null;
	currency: string;
	base_amount: number;
	tax_amount: number;
	tax_breakdown: Record<string, number>;
	additional_charges: Array<{ description: string; amount: number }>;
	discount: number;
	total_amount: number;
	line_items: OcrLineItem[];
	payment_method?: string | null;
	raw_text: string | null;
}

export interface ReconciliationStats {
	totalTransactions: number;
	reconciled: number;
	mismatches: number;
	suspicious: number;
	unresolved: number;
	reconciliationRate: number;
}

export interface ReconciliationItem {
	_id?: string;
	txCode: string;
	merchant: string;
	bankAmount: number;
	receiptAmount?: number;
	ledgerAmount?: number;
	currency?: string;
	source?: string;
	receiptRef?: string;
	status: 'MATCHED' | 'MISMATCH' | 'SUSPICIOUS';
	confidence: number;
	difference: number;
	reason: string;
	action: string;
	auditTrailStatus?: string;
	date?: string;
}

export interface AuditTrailRecord {
	txCode: string;
	source: string;
	receiptRef: string;
	aiDecision: 'MATCHED' | 'MISMATCH' | 'SUSPICIOUS';
	confidence: string;
	reason: string;
	decisionStatus: string;
	merchant: string;
	bankAmount: number;
	receiptAmount?: number;
	difference: number;
}
