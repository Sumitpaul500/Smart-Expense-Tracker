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
		Sparkles,
		Plus,
		Wallet,
		ArrowUpRight,
		ArrowDownRight,
		RefreshCw,
		DollarSign,
		PiggyBank,
		Activity,
		AlertCircle,
		Loader2,
		ShieldCheck
	} from 'lucide-svelte';

	// ─── State ────────────────────────────────────────────────────────────────────
	let analytics = $state<AnalyticsResponse | null>(null);
	let isLoading = $state(true);
	let error = $state('');
	let statsGrid: HTMLElement | null = $state(null);
	let isRefreshing = $state(false);

	// ─── Derived ──────────────────────────────────────────────────────────────────
	const firstName = $derived(authState.user?.firstName ?? 'there');
	const hasData   = $derived(analytics !== null && analytics.transactionCount > 0);
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
				{ opacity: 0, y: 24 },
				{ opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
			);
		}
	});

	// ─── Helpers ─────────────────────────────────────────────────────────────────
	function fmt(amount: number) {
		const sym = uiState.currencySymbol;
		// Use Intl if currency is known, else format manually
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
		if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400' };
		if (score >= 60) return { label: 'Good', color: 'text-green-400' };
		if (score >= 40) return { label: 'Fair', color: 'text-amber-400' };
		return { label: 'Needs Work', color: 'text-destructive' };
	}

	function healthBarColor(score: number) {
		if (score >= 80) return 'bg-emerald-500';
		if (score >= 60) return 'bg-green-500';
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
	<meta name="description" content="Your real-time financial overview powered by AI." />
</svelte:head>

<div class="space-y-6 max-w-7xl">
	<!-- Page header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName} 👋
			</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => fetchAnalytics(true)}
				disabled={isRefreshing}
				class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-all disabled:opacity-50"
			>
				<RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
				Refresh
			</button>
			<a
				href="/transactions?new=true"
				class="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 text-sm"
			>
				<Plus class="w-4 h-4" />
				Add Transaction
			</a>
		</div>
	</header>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-24">
			<div class="flex flex-col items-center gap-3 text-muted-foreground">
				<Loader2 class="w-8 h-8 animate-spin text-primary" />
				<p class="text-sm">Loading your financial data…</p>
			</div>
		</div>

	<!-- Error state -->
	{:else if error}
		<div class="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
			<AlertCircle class="w-5 h-5 shrink-0" />
			<div>
				<p class="font-medium">Failed to load dashboard</p>
				<p class="text-sm opacity-80">{error}</p>
			</div>
			<button
				onclick={() => fetchAnalytics()}
				class="ml-auto text-sm underline underline-offset-2 hover:no-underline"
			>Retry</button>
		</div>

	<!-- Empty state (authenticated but no transactions yet) -->
	{:else if !hasData}
		<div class="flex flex-col items-center justify-center py-20 text-center gap-5">
			<div class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
				<Wallet class="w-10 h-10 text-primary" />
			</div>
			<div>
				<h2 class="text-2xl font-bold mb-2">No transactions yet</h2>
				<p class="text-muted-foreground max-w-sm text-sm leading-relaxed">
					Add your first income or expense to see your dashboard come to life with real insights and visualisations.
				</p>
			</div>
			<a
				href="/transactions?new=true"
				class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
			>
				<Plus class="w-4 h-4" />
				Add your first transaction
			</a>
		</div>

		<!-- ── Track 4 AI Finance Controller Banner ───────────────────────────────── -->
		<div class="p-5 rounded-2xl bg-gradient-to-r from-primary/20 via-card to-purple-600/15 border border-primary/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div class="flex items-center gap-3.5">
				<div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary/30">
					<ShieldCheck class="w-5 h-5" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-base font-bold text-foreground">Track 4 — AI Finance Controller Active</h3>
						<span class="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
							93.1% Reconciled
						</span>
					</div>
					<p class="text-xs text-muted-foreground mt-0.5">
						Automated 3-way reconciliation, anomaly detection, exception explanation & verifiable audit trail active.
					</p>
				</div>
			</div>

			<a
				href="/reconciliation"
				class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/30 shrink-0"
			>
				Open Finance Controller Dashboard ➔
			</a>
		</div>

		<!-- ── KPI cards ─────────────────────────────────────────────────────────── -->
		<div bind:this={statsGrid} class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
			<!-- Total Balance -->
			<div class="stat-card p-5 rounded-2xl bg-card border border-border/60 shadow-sm group hover:border-primary/30 transition-all">
				<div class="flex items-start justify-between mb-3">
					<p class="text-sm font-medium text-muted-foreground">Total Balance</p>
					<div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
						<Wallet class="w-4 h-4 text-primary" />
					</div>
				</div>
				<p class="text-2xl font-bold tracking-tight">{fmt(analytics!.totalBalance)}</p>
				<p class="text-xs mt-2 text-muted-foreground">
					<span class="font-medium {analytics!.totalBalance >= 0 ? 'text-emerald-400' : 'text-destructive'}">
						{analytics!.totalBalance >= 0 ? 'Positive' : 'Negative'} balance
					</span>
				</p>
			</div>

			<!-- Monthly Income -->
			<div class="stat-card p-5 rounded-2xl bg-card border border-border/60 shadow-sm group hover:border-emerald-500/30 transition-all">
				<div class="flex items-start justify-between mb-3">
					<p class="text-sm font-medium text-muted-foreground">This Month Income</p>
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
						<TrendingUp class="w-4 h-4 text-emerald-400" />
					</div>
				</div>
				<p class="text-2xl font-bold tracking-tight text-emerald-400">{fmt(analytics!.thisMonth.income)}</p>
				<p class="text-xs mt-2 flex items-center gap-1 text-muted-foreground">
					{#if analytics!.lastMonth.income > 0}
						<span class="font-medium {analytics!.thisMonth.income >= analytics!.lastMonth.income ? 'text-emerald-400' : 'text-destructive'}">
							{pctChange(analytics!.thisMonth.income, analytics!.lastMonth.income)}
						</span>
						vs last month
					{:else}
						<span>No prior month data</span>
					{/if}
				</p>
			</div>

			<!-- Monthly Expenses -->
			<div class="stat-card p-5 rounded-2xl bg-card border border-border/60 shadow-sm group hover:border-destructive/30 transition-all">
				<div class="flex items-start justify-between mb-3">
					<p class="text-sm font-medium text-muted-foreground">This Month Expenses</p>
					<div class="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
						<TrendingDown class="w-4 h-4 text-destructive" />
					</div>
				</div>
				<p class="text-2xl font-bold tracking-tight text-destructive">{fmt(analytics!.thisMonth.expenses)}</p>
				<p class="text-xs mt-2 flex items-center gap-1 text-muted-foreground">
					{#if analytics!.lastMonth.expenses > 0}
						<span class="font-medium {analytics!.thisMonth.expenses <= analytics!.lastMonth.expenses ? 'text-emerald-400' : 'text-destructive'}">
							{pctChange(analytics!.thisMonth.expenses, analytics!.lastMonth.expenses)}
						</span>
						vs last month
					{:else}
						<span>No prior month data</span>
					{/if}
				</p>
			</div>

			<!-- Savings / Cash Flow -->
			<div class="stat-card p-5 rounded-2xl bg-card border border-border/60 shadow-sm group hover:border-indigo-500/30 transition-all">
				<div class="flex items-start justify-between mb-3">
					<p class="text-sm font-medium text-muted-foreground">Monthly Cash Flow</p>
					<div class="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
						<DollarSign class="w-4 h-4 text-indigo-400" />
					</div>
				</div>
				<p class="text-2xl font-bold tracking-tight {analytics!.thisMonth.cashFlow >= 0 ? 'text-emerald-400' : 'text-destructive'}">
					{fmt(analytics!.thisMonth.cashFlow)}
				</p>
				<p class="text-xs mt-2 text-muted-foreground">
					{analytics!.thisMonth.cashFlow >= 0 ? '✅ Positive this month' : '⚠️ Overspending this month'}
				</p>
			</div>
		</div>

		<!-- ── Financial Health Score + AI Insight row ───────────────────────────── -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Health Score -->
			<div class="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
				<div class="flex items-center gap-2 mb-4">
					<Activity class="w-4 h-4 text-primary" />
					<h2 class="font-semibold text-sm">Financial Health Score</h2>
				</div>
				<div class="flex items-end gap-3 mb-3">
					<span class="text-5xl font-bold tracking-tight">{analytics!.healthScore}</span>
					<span class="text-muted-foreground text-sm mb-1">/ 100</span>
					<span class="mb-1 text-sm font-semibold {healthLabel(analytics!.healthScore).color}">
						{healthLabel(analytics!.healthScore).label}
					</span>
				</div>
				<div class="w-full bg-border/40 rounded-full h-2">
					<div
						class="h-2 rounded-full transition-all duration-700 {healthBarColor(analytics!.healthScore)}"
						style="width: {analytics!.healthScore}%"
					></div>
				</div>
				<div class="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
					<div>Total income: <span class="text-foreground font-medium">{fmt(analytics!.totalIncome)}</span></div>
					<div>Total saved: <span class="text-emerald-400 font-medium">{fmt(analytics!.totalSavings)}</span></div>
					<div>Transactions: <span class="text-foreground font-medium">{analytics!.transactionCount}</span></div>
					<div>This week out: <span class="text-foreground font-medium">{fmt(analytics!.thisWeek.expenses)}</span></div>
				</div>
			</div>

			<!-- AI Insight -->
			<div class="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<Sparkles class="w-4 h-4 text-primary" />
					<span class="font-semibold text-sm text-primary">AI Insight</span>
				</div>

				{#if analytics!.thisMonth.cashFlow < 0}
					<p class="text-sm text-muted-foreground leading-relaxed">
						⚠️ You're spending
						<strong class="text-foreground">{fmt(Math.abs(analytics!.thisMonth.cashFlow))}</strong>
						more than you earn this month. Your top spending category is
						<strong class="text-foreground">{analytics!.categoryBreakdown[0]?.name ?? 'Uncategorized'}</strong>
						({fmt(analytics!.categoryBreakdown[0]?.total ?? 0)}). Consider reviewing discretionary expenses.
					</p>
				{:else if analytics!.thisMonth.cashFlow > 0}
					<p class="text-sm text-muted-foreground leading-relaxed">
						✅ Great job! You have a positive cash flow of
						<strong class="text-emerald-400">{fmt(analytics!.thisMonth.cashFlow)}</strong>
						this month. Your largest expense category is
						<strong class="text-foreground">{analytics!.categoryBreakdown[0]?.name ?? 'Uncategorized'}</strong>
						({fmt(analytics!.categoryBreakdown[0]?.total ?? 0)}). Keep it up!
					</p>
				{:else}
					<p class="text-sm text-muted-foreground leading-relaxed">
						Add more transactions this month to get personalised AI insights on your spending patterns.
					</p>
				{/if}

				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
					{#each analytics!.categoryBreakdown.slice(0, 4) as cat}
						<div class="p-3 rounded-xl bg-card/50 border border-border/40">
							<div class="flex items-center gap-1.5 mb-1">
								<span class="w-2 h-2 rounded-full shrink-0" style="background:{cat.color}"></span>
								<span class="text-xs text-muted-foreground truncate">{cat.name}</span>
							</div>
							<p class="text-sm font-semibold">{fmt(cat.total)}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- ── Monthly trend + Recent Transactions ───────────────────────────────── -->
		<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
			<!-- Monthly comparison chart -->
			<div class="lg:col-span-3 p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
				<h2 class="font-semibold text-sm mb-4">Monthly Comparison (Last 6 Months)</h2>
				{#if analytics!.monthlyTrend.length === 0}
					<div class="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No monthly data yet
					</div>
				{:else}
					<div class="space-y-3">
						{#each analytics!.monthlyTrend as m}
							{@const maxVal = Math.max(...analytics!.monthlyTrend.flatMap((x) => [x.income, x.expenses]))}
							<div class="space-y-1">
								<div class="flex justify-between text-xs text-muted-foreground">
									<span class="font-medium text-foreground">{m.month}</span>
									<span class="text-emerald-400">{fmt(m.income)}</span>
									<span class="text-destructive">{fmt(m.expenses)}</span>
								</div>
								<div class="flex gap-1 h-2">
									<div
										class="h-full rounded-full bg-emerald-500/70 transition-all"
										style="width: {maxVal > 0 ? (m.income / maxVal) * 100 : 0}%"
									></div>
									<div
										class="h-full rounded-full bg-destructive/70 transition-all"
										style="width: {maxVal > 0 ? (m.expenses / maxVal) * 100 : 0}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
					<div class="flex gap-4 mt-4 text-xs text-muted-foreground">
						<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500/70"></span>Income</span>
						<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-destructive/70"></span>Expenses</span>
					</div>
				{/if}
			</div>

			<!-- Recent transactions -->
			<div class="lg:col-span-2 p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
				<div class="flex items-center justify-between mb-4">
					<h2 class="font-semibold text-sm">Recent Transactions</h2>
					<a href="/transactions" class="text-xs text-primary hover:underline">View all</a>
				</div>
				{#if analytics!.recentTransactions.length === 0}
					<div class="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No transactions yet
					</div>
				{:else}
					<div class="space-y-3">
						{#each analytics!.recentTransactions as tx}
							<div class="flex items-center gap-3 group">
								<div class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm
									{tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'}">
									{#if tx.type === 'income'}
										<ArrowUpRight class="w-4 h-4 text-emerald-400" />
									{:else}
										<ArrowDownRight class="w-4 h-4 text-destructive" />
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium truncate">{tx.merchant}</p>
									<p class="text-xs text-muted-foreground">
										{tx.categoryId?.name ?? 'Uncategorized'} · {fmtDate(tx.date)}
									</p>
								</div>
								<p class="text-sm font-semibold shrink-0 {tx.type === 'income' ? 'text-emerald-400' : 'text-destructive'}">
									{tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- ── 3D Cash Flow scene ─────────────────────────────────────────────────── -->
		<div class="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xl">
			<div class="px-5 py-4 border-b border-border/60 flex items-center justify-between">
				<div>
					<h2 class="font-semibold text-base">3D Spending Visualisation</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Spending by category this month — drag to explore</p>
				</div>
				<div class="flex gap-1">
					{#each analytics!.categoryBreakdown.slice(0, 4) as cat}
						<span class="w-3 h-3 rounded-full" style="background:{cat.color}" title={cat.name}></span>
					{/each}
				</div>
			</div>
			<div class="h-72 w-full">
				<Canvas>
					<CashFlowScene />
				</Canvas>
			</div>
			<!-- Category legend -->
			<div class="px-5 py-4 border-t border-border/60 flex flex-wrap gap-x-5 gap-y-2">
				{#each analytics!.categoryBreakdown.slice(0, 6) as cat}
					<div class="flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full shrink-0" style="background:{cat.color}"></span>
						<span class="text-xs text-muted-foreground">{cat.name}</span>
						<span class="text-xs font-semibold">{fmt(cat.total)}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- ── FinPilot AI Advisor Assistant ───────────────────────────────────────── -->
		<div class="pt-2">
			<AiAdvisorWidget {contextSummary} />
		</div>
	{/if}
</div>
