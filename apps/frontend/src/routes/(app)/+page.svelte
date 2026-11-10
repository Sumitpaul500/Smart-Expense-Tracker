<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import { Canvas } from '@threlte/core';
	import CashFlowScene from '$lib/components/3d/CashFlowScene.svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { uiState } from '$lib/stores/ui.svelte';
	import { transactionApi, type AnalyticsResponse, type Transaction } from '$lib/api';
	import AiAdvisorWidget from '$lib/components/shared/AiAdvisorWidget.svelte';
	import {
		TrendingUp,
		TrendingDown,
		Plus,
		Wallet,
		ArrowUpRight,
		ArrowDownRight,
		RefreshCw,
		DollarSign,
		Activity,
		AlertCircle,
		Loader2,
		ShieldCheck,
		ArrowRight
	} from 'lucide-svelte';

	// ─── State ────────────────────────────────────────────────────────────────────
	let analytics = $state<AnalyticsResponse | null>(null);
	let isLoading = $state(true);
	let error = $state('');
	let statsGrid: HTMLElement | null = $state(null);
	let isRefreshing = $state(false);

	// ─── Derived ──────────────────────────────────────────────────────────────────
	const firstName = $derived(authState.user?.firstName ?? 'User');
	const hasData   = $derived(analytics !== null && (analytics.transactionCount > 0 || (analytics.recentTransactions && analytics.recentTransactions.length > 0)));
	const contextSummary = $derived(
		analytics
			? `Total Income: ${fmt(analytics.totalIncome)}, Total Expenses: ${fmt(analytics.totalExpenses)}, Net Savings: ${fmt(analytics.totalSavings)}, Health Score: ${analytics.healthScore}/100, Top Category: ${analytics.categoryBreakdown[0]?.name ?? 'None'} (${fmt(analytics.categoryBreakdown[0]?.total ?? 0)}).`
			: ''
	);

	// ─── Fetch analytics ──────────────────────────────────────────────────────────
	async function fetchAnalytics(showRefresh = false) {
		if (showRefresh) isRefreshing = true;
		else isLoading = true;
		error = '';
		try {
			analytics = await transactionApi.analytics();
		} catch (e: any) {
			error = e.message ?? 'Failed to load analytics.';
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	onMount(async () => {
		await fetchAnalytics();
		if (statsGrid) {
			gsap.fromTo(
				statsGrid.querySelectorAll('.stat-card'),
				{ opacity: 0, y: 12 },
				{ opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
			);
		}
	});

	// ─── Helpers ─────────────────────────────────────────────────────────────────
	function fmt(amount: number) {
		const sym = uiState.currencySymbol;
		try {
			return new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency: uiState.currency,
				maximumFractionDigits: 2,
			}).format(amount);
		} catch {
			return `${sym}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
		}
	}

	function fmtDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	}

	function pctChange(current: number, previous: number) {
		if (previous === 0) return current > 0 ? '+100%' : '—';
		const pct = ((current - previous) / previous) * 100;
		return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
	}

	function healthLabel(score: number) {
		if (score >= 80) return { label: 'Optimal', color: 'text-emerald-400' };
		if (score >= 60) return { label: 'Stable', color: 'text-emerald-500' };
		if (score >= 40) return { label: 'Moderate', color: 'text-amber-400' };
		return { label: 'Attention Needed', color: 'text-destructive' };
	}

	function healthBarColor(score: number) {
		if (score >= 80) return 'bg-emerald-500';
		if (score >= 60) return 'bg-emerald-600';
		if (score >= 40) return 'bg-amber-500';
		return 'bg-destructive';
	}

	// Compute 3D chart category data from analytics
	const chartCategories = $derived(
		analytics?.categoryBreakdown.slice(0, 6).map((c) => ({
			label: c.name,
			color: c.color,
			amount: c.total,
		})) ?? []
	);
</script>

<svelte:head>
	<title>Dashboard — FinPilot AI</title>
	<meta name="description" content="Institutional financial overview and accounting intelligence." />
</svelte:head>

<div class="space-y-6 max-w-7xl">
	<!-- Page header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				Financial Overview
			</h1>
			<p class="text-muted-foreground mt-1 text-xs">
				Welcome back, {firstName} · {new Date().toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
			</p>
		</div>
		<div class="flex items-center gap-2.5">
			<button
				onclick={() => fetchAnalytics(true)}
				disabled={isRefreshing}
				class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground bg-secondary/80 hover:bg-secondary border border-border/70 transition-colors disabled:opacity-50"
			>
				<RefreshCw class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin' : ''}" />
				Refresh
			</button>
			<a
				href="/transactions?new=true"
				class="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs shadow-xs"
			>
				<Plus class="w-3.5 h-3.5" />
				Record Transaction
			</a>
		</div>
	</header>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-20">
			<div class="flex flex-col items-center gap-3 text-muted-foreground">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
				<p class="text-xs">Aggregating financial ledgers…</p>
			</div>
		</div>

	<!-- Error state -->
	{:else if error}
		<div class="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
			<AlertCircle class="w-4 h-4 shrink-0" />
			<div>
				<p class="font-medium text-xs">Unable to load dashboard metrics</p>
				<p class="text-xs opacity-90">{error}</p>
			</div>
			<button
				onclick={() => fetchAnalytics()}
				class="ml-auto text-xs font-semibold underline underline-offset-2 hover:no-underline"
			>Retry</button>
		</div>

	<!-- Empty state -->
	{:else if !hasData}
		<div class="flex flex-col items-center justify-center py-16 text-center gap-4 bg-card border border-border/70 rounded-xl p-8">
			<div class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
				<Wallet class="w-6 h-6" />
			</div>
			<div>
				<h2 class="text-lg font-semibold text-foreground">No ledger transactions found</h2>
				<p class="text-muted-foreground max-w-sm text-xs mt-1 leading-relaxed">
					Record your initial income or expense entry to initiate automatic cash flow metrics, category breakdowns, and AI audits.
				</p>
			</div>
			<a
				href="/transactions?new=true"
				class="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
			>
				<Plus class="w-3.5 h-3.5" />
				Record First Entry
			</a>
		</div>

	<!-- Data loaded -->
	{:else}

		<!-- AI Controller Status Header Banner -->
		<div class="p-4 rounded-xl bg-card border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
					<ShieldCheck class="w-4.5 h-4.5" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-sm font-semibold text-foreground">AI Controller Monitoring</h3>
						<span class="px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
							Audit Active
						</span>
					</div>
					<p class="text-xs text-muted-foreground mt-0.5">
						Automated 3-way reconciliation across bank statements, receipt OCR, and general ledger.
					</p>
				</div>
			</div>

			<a
				href="/reconciliation"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border/70 font-medium text-xs transition-colors shrink-0"
			>
				<span>Open Reconciliation View</span>
				<ArrowRight class="w-3.5 h-3.5" />
			</a>
		</div>

		<!-- KPI Summary Cards -->
		<div bind:this={statsGrid} class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
			<!-- Total Balance -->
			<div class="stat-card p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-medium text-muted-foreground">Total Balance</span>
					<Wallet class="w-4 h-4 text-muted-foreground" />
				</div>
				<p class="text-2xl font-semibold tracking-tight font-mono">{fmt(analytics!.totalBalance)}</p>
				<p class="text-xs mt-2">
					<span class="font-medium {analytics!.totalBalance >= 0 ? 'text-emerald-400' : 'text-destructive'}">
						{analytics!.totalBalance >= 0 ? 'Positive Net Position' : 'Deficit Position'}
					</span>
				</p>
			</div>

			<!-- Monthly Income -->
			<div class="stat-card p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-medium text-muted-foreground">This Month Inflow</span>
					<TrendingUp class="w-4 h-4 text-emerald-400" />
				</div>
				<p class="text-2xl font-semibold tracking-tight font-mono text-emerald-400">{fmt(analytics!.thisMonth.income)}</p>
				<p class="text-xs mt-2 text-muted-foreground">
					{#if analytics!.lastMonth.income > 0}
						<span class="font-medium {analytics!.thisMonth.income >= analytics!.lastMonth.income ? 'text-emerald-400' : 'text-destructive'}">
							{pctChange(analytics!.thisMonth.income, analytics!.lastMonth.income)}
						</span>
						vs prior month
					{:else}
						<span>Initial period</span>
					{/if}
				</p>
			</div>

			<!-- Monthly Expenses -->
			<div class="stat-card p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-medium text-muted-foreground">This Month Outflow</span>
					<TrendingDown class="w-4 h-4 text-destructive" />
				</div>
				<p class="text-2xl font-semibold tracking-tight font-mono text-foreground">{fmt(analytics!.thisMonth.expenses)}</p>
				<p class="text-xs mt-2 text-muted-foreground">
					{#if analytics!.lastMonth.expenses > 0}
						<span class="font-medium {analytics!.thisMonth.expenses <= analytics!.lastMonth.expenses ? 'text-emerald-400' : 'text-destructive'}">
							{pctChange(analytics!.thisMonth.expenses, analytics!.lastMonth.expenses)}
						</span>
						vs prior month
					{:else}
						<span>Initial period</span>
					{/if}
				</p>
			</div>

			<!-- Cash Flow -->
			<div class="stat-card p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-medium text-muted-foreground">Net Cash Flow</span>
					<DollarSign class="w-4 h-4 text-primary" />
				</div>
				<p class="text-2xl font-semibold tracking-tight font-mono {analytics!.thisMonth.cashFlow >= 0 ? 'text-emerald-400' : 'text-destructive'}">
					{fmt(analytics!.thisMonth.cashFlow)}
				</p>
				<p class="text-xs mt-2 text-muted-foreground">
					{analytics!.thisMonth.cashFlow >= 0 ? 'Surplus this cycle' : 'Operating deficit this cycle'}
				</p>
			</div>
		</div>

		<!-- Financial Health & Advisor Summary -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Health Score -->
			<div class="p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center gap-2 mb-3">
					<Activity class="w-4 h-4 text-primary" />
					<h2 class="font-medium text-xs text-muted-foreground">Financial Health Index</h2>
				</div>
				<div class="flex items-baseline gap-2 mb-3">
					<span class="text-4xl font-semibold tracking-tight font-mono">{analytics!.healthScore}</span>
					<span class="text-muted-foreground text-xs">/ 100</span>
					<span class="ml-auto text-xs font-medium {healthLabel(analytics!.healthScore).color}">
						{healthLabel(analytics!.healthScore).label}
					</span>
				</div>
				<div class="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-500 {healthBarColor(analytics!.healthScore)}"
						style="width: {analytics!.healthScore}%"
					></div>
				</div>
				<div class="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
					<div>Income: <span class="text-foreground font-mono font-medium">{fmt(analytics!.totalIncome)}</span></div>
					<div>Saved: <span class="text-emerald-400 font-mono font-medium">{fmt(analytics!.totalSavings)}</span></div>
					<div>Entries: <span class="text-foreground font-mono font-medium">{analytics!.transactionCount}</span></div>
					<div>7-day outflow: <span class="text-foreground font-mono font-medium">{fmt(analytics!.thisWeek.expenses)}</span></div>
				</div>
			</div>

			<!-- AI Insight Summary -->
			<div class="lg:col-span-2 p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between gap-3">
				<div>
					<div class="flex items-center gap-2 mb-2">
						<span class="w-2 h-2 rounded-full bg-primary"></span>
						<span class="text-xs font-semibold text-foreground">Automated Analysis</span>
					</div>

					{#if analytics!.thisMonth.cashFlow < 0}
						<p class="text-xs text-muted-foreground leading-relaxed">
							Outflow exceeds inflow by
							<strong class="text-foreground font-mono">{fmt(Math.abs(analytics!.thisMonth.cashFlow))}</strong>
							during the current billing period. Primary expenditure category is
							<strong class="text-foreground">{analytics!.categoryBreakdown[0]?.name ?? 'Uncategorized'}</strong>
							(<span class="font-mono">{fmt(analytics!.categoryBreakdown[0]?.total ?? 0)}</span>). Consider examining discretionary allocations.
						</p>
					{:else if analytics!.thisMonth.cashFlow > 0}
						<p class="text-xs text-muted-foreground leading-relaxed">
							Operating cash flow remains positive at
							<strong class="text-emerald-400 font-mono">{fmt(analytics!.thisMonth.cashFlow)}</strong>
							for the current billing period. Largest categorized outflow is
							<strong class="text-foreground">{analytics!.categoryBreakdown[0]?.name ?? 'Uncategorized'}</strong>
							(<span class="font-mono">{fmt(analytics!.categoryBreakdown[0]?.total ?? 0)}</span>).
						</p>
					{:else}
						<p class="text-xs text-muted-foreground leading-relaxed">
							Record additional ledger entries to generate structured expenditure insights.
						</p>
					{/if}
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/60">
					{#each analytics!.categoryBreakdown.slice(0, 4) as cat}
						<div class="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
							<div class="flex items-center gap-1.5 mb-1">
								<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{cat.color}"></span>
								<span class="text-xs text-muted-foreground truncate">{cat.name}</span>
							</div>
							<p class="text-xs font-semibold font-mono text-foreground">{fmt(cat.total)}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Trend & Recent Transactions -->
		<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
			<!-- Monthly comparison -->
			<div class="lg:col-span-3 p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-4">
					<h2 class="font-medium text-xs text-muted-foreground">Monthly Inflow vs Outflow</h2>
					<div class="flex items-center gap-3 text-xs text-muted-foreground">
						<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Inflow</span>
						<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-destructive"></span>Outflow</span>
					</div>
				</div>

				{#if analytics!.monthlyTrend.length === 0}
					<div class="flex items-center justify-center h-36 text-muted-foreground text-xs">
						Insufficient historical data
					</div>
				{:else}
					<div class="space-y-3">
						{#each analytics!.monthlyTrend as m}
							{@const maxVal = Math.max(...analytics!.monthlyTrend.flatMap((x) => [x.income, x.expenses]))}
							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="font-medium text-foreground">{m.month}</span>
									<div class="flex gap-3 font-mono">
										<span class="text-emerald-400">{fmt(m.income)}</span>
										<span class="text-destructive">{fmt(m.expenses)}</span>
									</div>
								</div>
								<div class="flex gap-1 h-1.5 bg-secondary rounded-full overflow-hidden">
									<div
										class="h-full bg-emerald-500 rounded-full"
										style="width: {maxVal > 0 ? (m.income / maxVal) * 100 : 0}%"
									></div>
									<div
										class="h-full bg-destructive rounded-full"
										style="width: {maxVal > 0 ? (m.expenses / maxVal) * 100 : 0}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent transactions -->
			<div class="lg:col-span-2 p-5 rounded-xl bg-card border border-border/70 shadow-xs">
				<div class="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
					<h2 class="font-medium text-xs text-muted-foreground">Recent Transactions</h2>
					<a href="/transactions" class="text-xs text-primary hover:underline font-medium">View all</a>
				</div>

				{#if analytics!.recentTransactions.length === 0}
					<div class="flex items-center justify-center h-36 text-muted-foreground text-xs">
						No recent transactions
					</div>
				{:else}
					<div class="divide-y divide-border/40">
						{#each analytics!.recentTransactions as tx}
							<div class="py-2.5 flex items-center justify-between gap-3">
								<div class="flex items-center gap-2.5 min-w-0">
									<div class="w-7 h-7 rounded-md shrink-0 flex items-center justify-center
										{tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'}">
										{#if tx.type === 'income'}
											<ArrowUpRight class="w-3.5 h-3.5" />
										{:else}
											<ArrowDownRight class="w-3.5 h-3.5" />
										{/if}
									</div>
									<div class="min-w-0">
										<p class="text-xs font-medium text-foreground truncate">{tx.merchant}</p>
										<p class="text-[11px] text-muted-foreground">
											{tx.categoryId?.name ?? 'General'} · {fmtDate(tx.date)}
										</p>
									</div>
								</div>
								<span class="text-xs font-mono font-semibold shrink-0 {tx.type === 'income' ? 'text-emerald-400' : 'text-foreground'}">
									{tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- 3D Visualization -->
		<div class="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
			<div class="px-5 py-3 border-b border-border/60 flex items-center justify-between">
				<div>
					<h2 class="font-medium text-xs text-muted-foreground">3D Category Allocation</h2>
					<p class="text-xs text-foreground mt-0.5 font-semibold">Active monthly distribution</p>
				</div>
				<div class="flex items-center gap-1.5">
					{#each analytics!.categoryBreakdown.slice(0, 4) as cat}
						<span class="w-2.5 h-2.5 rounded-full" style="background:{cat.color}" title={cat.name}></span>
					{/each}
				</div>
			</div>
			<div class="h-64 w-full bg-secondary/10">
				<Canvas>
					<CashFlowScene />
				</Canvas>
			</div>
			<!-- Category legend -->
			<div class="px-5 py-3 border-t border-border/60 flex flex-wrap gap-x-4 gap-y-2 text-xs">
				{#each analytics!.categoryBreakdown.slice(0, 6) as cat}
					<div class="flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full shrink-0" style="background:{cat.color}"></span>
						<span class="text-muted-foreground">{cat.name}</span>
						<span class="font-mono font-medium text-foreground">{fmt(cat.total)}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- FinPilot Advisor Assistant Section -->
		<div>
			<AiAdvisorWidget {contextSummary} />
		</div>
	{/if}
</div>
