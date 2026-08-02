// Svelte 5 rune-based auth store (replaces Zustand auth slice)
// This is a .svelte.ts file so runes ($state) work at module scope.

interface AuthUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	financialHealthScore?: number;
}

// ─── Reactive state ───────────────────────────────────────────────────────────
export const authState = $state<{
	user: AuthUser | null;
	token: string | null;
	isAuthenticated: boolean;
}>({
	user: null,
	token: null,
	isAuthenticated: false,
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export function login(user: AuthUser, token: string): void {
	authState.user = user;
	authState.token = token;
	authState.isAuthenticated = true;

	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('fp_token', token);
		localStorage.setItem('fp_user', JSON.stringify(user));
	}
}

export function clearAuth(): void {
	authState.user = null;
	authState.token = null;
	authState.isAuthenticated = false;

	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('fp_token');
		localStorage.removeItem('fp_user');
	}
}

// ─── Hydrate from localStorage on module load ─────────────────────────────────
if (typeof localStorage !== 'undefined') {
	const token = localStorage.getItem('fp_token');
	const userStr = localStorage.getItem('fp_user');
	if (token && userStr) {
		try {
			const user = JSON.parse(userStr) as AuthUser;
			authState.user = user;
			authState.token = token;
			authState.isAuthenticated = true;
		} catch {
			// Corrupted data — clear it
			localStorage.removeItem('fp_token');
			localStorage.removeItem('fp_user');
		}
	}
}
