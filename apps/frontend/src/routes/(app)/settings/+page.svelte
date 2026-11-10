<script lang="ts">
	import { authState, clearAuth } from '$lib/stores/auth.svelte';
	import { uiState, setCurrency } from '$lib/stores/ui.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		User,
		LogOut,
		Palette,
		Server,
		Bot,
		Settings,
		Info,
		CheckCircle2,
		XCircle,
		Moon,
		Sun,
		Laptop,
		Activity
	} from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';

	const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

	let currentTheme = $state<'light' | 'dark' | 'system'>('system');
	let backendStatus = $state<'connected' | 'disconnected' | 'checking'>('checking');
	let backendLatency = $state<number | null>(null);
	let aiStatus = $state<'connected' | 'disconnected' | 'checking'>('checking');

	onMount(() => {
		const savedTheme = localStorage.getItem('fp_theme') as 'light' | 'dark' | 'system';
		if (savedTheme) {
			currentTheme = savedTheme;
		}
		applyTheme(currentTheme);
		pingServer();
	});

	function applyTheme(theme: 'light' | 'dark' | 'system') {
		if (typeof window === 'undefined') return;
		const root = window.document.documentElement;
		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			root.classList.remove('light', 'dark');
			root.classList.add(systemTheme);
		} else {
			root.classList.remove('light', 'dark');
			root.classList.add(theme);
		}
	}

	function setTheme(theme: 'light' | 'dark' | 'system') {
		currentTheme = theme;
		localStorage.setItem('fp_theme', theme);
		applyTheme(theme);
	}

	async function pingServer() {
		backendStatus = 'checking';
		aiStatus = 'checking';
		backendLatency = null;
		
		const start = performance.now();
		try {
			const res = await fetch(`${BASE_URL}/health`);
			if (res.ok) {
				backendStatus = 'connected';
				backendLatency = Math.round(performance.now() - start);
				aiStatus = 'connected';
			} else {
				backendStatus = 'disconnected';
				aiStatus = 'disconnected';
			}
		} catch (err) {
			backendStatus = 'disconnected';
			aiStatus = 'disconnected';
		}
	}

	function handleSignOut() {
		clearAuth();
		goto('/login');
	}
</script>

<svelte:head>
	<title>Settings — FinPilot AI</title>
	<meta name="description" content="Manage workspace configuration, localization currency, and server connections." />
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6 pb-12" in:fade={{ duration: 150 }}>
	<header class="pb-2 border-b border-border/60">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">Settings & Preferences</h1>
		<p class="text-muted-foreground mt-0.5 text-xs">Manage system environment, currency standards, and connection health.</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-12 gap-6">
		<!-- Left Column / Account & Info -->
		<div class="md:col-span-4 space-y-4">
			<!-- Account Widget -->
			<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
				<div class="flex items-center gap-3">
					<div class="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-base shrink-0">
						{authState.user?.firstName?.[0] || 'U'}
					</div>
					<div class="min-w-0 flex-1">
						<h3 class="font-medium text-xs text-foreground truncate">{authState.user?.firstName} {authState.user?.lastName}</h3>
						<p class="text-[11px] text-muted-foreground truncate">{authState.user?.email}</p>
					</div>
				</div>
				<div class="mt-4 pt-3 border-t border-border/60">
					<button
						onclick={handleSignOut}
						class="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded-lg transition-colors font-medium text-xs"
					>
						<LogOut class="w-3.5 h-3.5" />
						Sign Out
					</button>
				</div>
			</div>

			<!-- About -->
			<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
				<h3 class="font-medium text-xs text-foreground flex items-center gap-1.5 mb-3">
					<Info class="w-3.5 h-3.5 text-primary" />
					Platform Version
				</h3>
				<div class="text-xs space-y-2 text-muted-foreground">
					<div class="flex justify-between"><span>Core Platform</span><span class="font-mono text-foreground font-medium">1.0.0</span></div>
					<div class="flex justify-between"><span>Architecture</span><span class="font-mono text-foreground font-medium">Svelte 5 / SvelteKit</span></div>
					<div class="pt-2 border-t border-border/40 flex gap-4 text-[11px]">
						<button type="button" class="hover:text-primary transition-colors hover:underline">Privacy Policy</button>
						<button type="button" class="hover:text-primary transition-colors hover:underline">Terms of Service</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column / Configuration -->
		<div class="md:col-span-8 space-y-4">
			<!-- Appearance -->
			<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
				<div class="mb-4">
					<h2 class="text-xs font-semibold text-foreground flex items-center gap-1.5">
						<Palette class="w-4 h-4 text-primary" />
						Theme Preference
					</h2>
					<p class="text-[11px] text-muted-foreground mt-0.5">Select interface color appearance.</p>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<button 
						onclick={() => setTheme('light')}
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors {currentTheme === 'light' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
					>
						<div class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
							<Sun class="w-4 h-4 text-amber-500" />
						</div>
						<span class="text-xs">Light</span>
					</button>

					<button 
						onclick={() => setTheme('dark')}
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors {currentTheme === 'dark' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
					>
						<div class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
							<Moon class="w-4 h-4 text-foreground" />
						</div>
						<span class="text-xs">Dark</span>
					</button>

					<button 
						onclick={() => setTheme('system')}
						class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors {currentTheme === 'system' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
					>
						<div class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
							<Laptop class="w-4 h-4 text-foreground" />
						</div>
						<span class="text-xs">System</span>
					</button>
				</div>
			</div>

			<!-- Localization Preferences -->
			<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
				<div class="mb-4">
					<h2 class="text-xs font-semibold text-foreground flex items-center gap-1.5">
						<Settings class="w-4 h-4 text-primary" />
						Localization & Ledgers
					</h2>
					<p class="text-[11px] text-muted-foreground mt-0.5">Configure default accounting currency and date notation.</p>
				</div>

				<div class="divide-y divide-border/40 space-y-3">
					<!-- Currency row -->
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
						<div class="space-y-0.5">
							<span class="text-xs font-medium text-foreground">Base Currency</span>
							<p class="text-[11px] text-muted-foreground">Standardizes all transaction formatting, analytics, and statements.</p>
						</div>
						<div class="sm:shrink-0 w-full sm:w-auto">
							<select
								value={uiState.currency}
								onchange={(e) => setCurrency((e.target as HTMLSelectElement).value as any)}
								class="w-full sm:w-60 bg-secondary/50 text-xs text-foreground border border-border/70 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
							>
								<option value="INR">INR (₹) — Indian Rupee</option>
								<option value="USD">USD ($) — US Dollar</option>
								<option value="EUR">EUR (€) — Euro</option>
								<option value="GBP">GBP (£) — British Pound</option>
							</select>
						</div>
					</div>

					<!-- Date format row -->
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
						<div class="space-y-0.5">
							<span class="text-xs font-medium text-foreground">Date Notation</span>
							<p class="text-[11px] text-muted-foreground">Calendar display standard across all ledger tables.</p>
						</div>
						<div class="sm:shrink-0 w-full sm:w-auto">
							<select class="w-full sm:w-60 bg-secondary/50 text-xs text-foreground border border-border/70 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
								<option>DD/MM/YYYY</option>
								<option>MM/DD/YYYY</option>
							</select>
						</div>
					</div>
				</div>
			</div>

			<!-- System & Backend Connections -->
			<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-xs font-semibold text-foreground flex items-center gap-1.5">
							<Server class="w-4 h-4 text-primary" />
							Service Health & Endpoints
						</h2>
						<p class="text-[11px] text-muted-foreground mt-0.5">Backend API and intelligence runtime connectivity.</p>
					</div>
					<button 
						onclick={pingServer}
						disabled={backendStatus === 'checking'}
						class="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/70 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
					>
						<Activity class="w-3.5 h-3.5 {backendStatus === 'checking' ? 'animate-spin' : ''}" />
						Ping Service
					</button>
				</div>

				<div class="space-y-2.5 text-xs">
					<div class="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
						<div class="space-y-0.5">
							<div class="font-medium text-foreground">Core API Endpoint</div>
							<div class="text-[11px] text-muted-foreground font-mono">{BASE_URL}</div>
						</div>
						<div class="flex items-center gap-1.5">
							{#if backendStatus === 'checking'}
								<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
								<span class="text-xs text-amber-400">Verifying</span>
							{:else if backendStatus === 'connected'}
								<CheckCircle2 class="w-4 h-4 text-emerald-500" />
								<span class="text-xs text-emerald-400 font-medium">Online</span>
							{:else}
								<XCircle class="w-4 h-4 text-destructive" />
								<span class="text-xs text-destructive font-medium">Offline</span>
							{/if}
						</div>
					</div>

					<div class="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
						<div class="space-y-0.5">
							<div class="font-medium text-foreground">AI Intelligence Service</div>
							<div class="text-[11px] text-muted-foreground font-mono">Gemini 1.5 Flash Microservice</div>
						</div>
						<div class="flex items-center gap-1.5">
							{#if aiStatus === 'checking'}
								<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
								<span class="text-xs text-amber-400">Verifying</span>
							{:else if aiStatus === 'connected'}
								<CheckCircle2 class="w-4 h-4 text-emerald-500" />
								<span class="text-xs text-emerald-400 font-medium">Online</span>
							{:else}
								<XCircle class="w-4 h-4 text-destructive" />
								<span class="text-xs text-destructive font-medium">Offline</span>
							{/if}
						</div>
					</div>
					
					{#if backendLatency !== null}
						<div class="flex items-center justify-between px-1 text-xs text-muted-foreground" transition:slide>
							<span>Round-trip Latency</span>
							<span class="font-mono font-medium text-foreground">{backendLatency} ms</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
