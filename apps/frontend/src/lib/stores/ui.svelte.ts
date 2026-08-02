// Svelte 5 rune-based UI store (replaces Zustand UI slice)

// ─── Reactive state ───────────────────────────────────────────────────────────
export const uiState = $state({
	isChatOpen: false,
	isSidebarCollapsed: false,
	isSidebarOpen: false,
	isGlobalLoading: false,
	theme: (typeof localStorage !== 'undefined'
		? (localStorage.getItem('fp_theme') as 'dark' | 'light' | 'system' ?? 'dark')
		: 'dark') as 'dark' | 'light' | 'system',
	currency: (typeof localStorage !== 'undefined'
		? (localStorage.getItem('fp_currency') as 'USD' | 'INR' | 'EUR' | 'GBP' ?? 'INR')
		: 'INR') as 'USD' | 'INR' | 'EUR' | 'GBP',
	get currencySymbol() {
		const symbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
		return symbols[this.currency] ?? '₹';
	}
});

// Apply theme to <html> element
export function applyTheme(theme: 'dark' | 'light' | 'system') {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
	root.classList.toggle('light', !isDark);
	localStorage.setItem('fp_theme', theme);
}

// Init theme on load
if (typeof window !== 'undefined') {
	applyTheme(uiState.theme);
	// Listen for system preference changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (uiState.theme === 'system') applyTheme('system');
	});
}

// ─── Actions ──────────────────────────────────────────────────────────────────
export function toggleChat(): void {
	uiState.isChatOpen = !uiState.isChatOpen;
}

export function openChat(): void {
	uiState.isChatOpen = true;
}

export function closeChat(): void {
	uiState.isChatOpen = false;
}

export function toggleSidebar(): void {
	uiState.isSidebarOpen = !uiState.isSidebarOpen;
}

export function closeSidebar(): void {
	uiState.isSidebarOpen = false;
}

export function openSidebar(): void {
	uiState.isSidebarOpen = true;
}

export function setGlobalLoading(value: boolean): void {
	uiState.isGlobalLoading = value;
}

export function setTheme(theme: 'dark' | 'light' | 'system'): void {
	uiState.theme = theme;
	applyTheme(theme);
}

export function setCurrency(currency: 'USD' | 'INR' | 'EUR' | 'GBP'): void {
	uiState.currency = currency;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('fp_currency', currency);
	}
}
