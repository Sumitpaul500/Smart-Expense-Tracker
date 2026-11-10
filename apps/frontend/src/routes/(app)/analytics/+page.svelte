<script lang="ts">
	import { onMount } from 'svelte';
	import { transactionApi, type AnalyticsResponse } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import MonthlyChart from '$lib/components/charts/MonthlyChart.svelte';
	import DoughnutChart from '$lib/components/charts/DoughnutChart.svelte';
	import WeeklyChart from '$lib/components/charts/WeeklyChart.svelte';
	import {
		BarChart3,
		PieChart,
		TrendingUp,
		TrendingDown,
		ArrowUpRight,
		ArrowDownRight,
		Loader2,
		AlertCircle,
		Wallet,
		Calendar,
		Activity
	} from 'lucide-svelte';

	// ── State ─────────────────────────────────────────────────────────────────
	let analytics = $state<AnalyticsResponse | null>(null);
	let isLoading = $state(true);
	let error = $state('');

	// ── Filter State ──────────────────────────────────────────────────────────
	let dateRange = $state<'all' | '30days' | '6months' | '1year'>('all');
	let selectedCategory = $state<string>('');

	const dateParams = $derived.by(() => {
		const now = new Date();
		if (dateRange === '30days') {
			const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			return { startDate: start.toISOString() };
		}
		if (dateRange === '6months') {
			const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
			return { startDate: start.toISOString() };
		}
		if (dateRange === '1year') {
			const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
			return { startDate: start.toISOString() };
		}
		return {};
	});

	// Fetch when currency, date range, or category filter changes
	$effect(() => {
		const params: any = {
			currency: uiState.currency
		};
		if (dateParams.startDate) params.startDate = dateParams.startDate;
		if (selectedCategory) params.categoryId = selectedCategory;
		fetchAnalytics(params);
	});

	// ── Fetch ─────────────────────────────────────────────────────────────────
	async function fetchAnalytics(params?: any) {
		isLoading = true;
		error = '';
		try {
			analytics = await transactionApi.analytics(params);
		} catch (e: any) {
			error = e.message ?? 'Failed to load analytics';
		} finally {
			isLoading = false;
		}
	}

	// ── Currency formatter ────────────────────────────────────────────────────
	function fmt(amount: number) {
		try {
			return new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency: uiState.currency,
				maximumFractionDigits: 0,
			}).format(amount);
		} catch {
			return `${uiState.currencySymbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
		}
	}

	// ── Computed chart values ─────────────────────────────────────────────────
	const totalCategorySpend = $derived(
		analytics ? analytics.categoryBreakdown.reduce((s, c) => s + c.total, 0) : 1
	);

	function buildPieSlices(cats: { name: string; color: string; total: number; count: number; _id: string | null; icon: string }[]) {
		return cats.map((cat) => {
			const pct = totalCategorySpend > 0 ? cat.total / totalCategorySpend : 0;
			return { ...cat, pct };
		});
	}

	const pieSlices = $derived(analytics ? buildPieSlices(analytics.categoryBreakdown.slice(0, 8)) : []);

	// Savings rate
	const savingsRate = $derived(
		analytics && analytics.totalIncome > 0
			? Math.round((analytics.totalSavings / analytics.totalIncome) * 100)
			: 0
	);
</script>

<svelte:head>
	<title>Analytics — FinPilot AI</title>
	<meta name="description" content="Financial analytics, cash flow distributions, and spending intelligence." />
</svelte:head>

<div class="space-y-6 max-w-7xl">
	<!-- Header -->
	<header class="flex items-center justify-between pb-2 border-b border-border/60">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">Financial Analytics</h1>
			<p class="text-muted-foreground mt-1 text-xs">Temporal trends, category concentrations, and savings velocity.</p>
		</div>
		<button
			onclick={() => fetchAnalytics({ currency: uiState.currency })}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/70 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
		>
			<Activity class="w-3.5 h-3.5 text-primary" />
			Refresh
		</button>
	</header>

	<!-- Filters Toolbar -->
	<div class="flex flex-wrap gap-4 items-center justify-between p-3.5 bg-card border border-border/70 rounded-xl shadow-xs">
		<div class="flex flex-wrap gap-4 items-center">
			<!-- Date Range Quick Filter -->
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-muted-foreground">Range:</span>
				<div class="flex p-0.5 rounded-lg bg-secondary/40 border border-border/60">
					{#each [
						{ label: 'All', value: 'all' },
						{ label: '30 Days', value: '30days' },
						{ label: '6 Months', value: '6months' },
						{ label: '1 Year', value: '1year' }
					] as opt}
						<button
							onclick={() => (dateRange = opt.value as any)}
							class="px-2.5 py-1 rounded text-xs font-medium transition-colors
								{dateRange === opt.value ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Category Filter -->
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-muted-foreground">Category:</span>
				<select
					bind:value={selectedCategory}
					class="bg-secondary/40 text-xs border border-border/60 rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
				>
					<option value="">All Categories</option>
					{#if analytics}
						{#each analytics.categoryBreakdown as cat}
							<option value={cat._id}>{cat.name}</option>
						{/each}
					{/if}
				</select>
			</div>
		</div>

		<!-- Currency Indicator -->
		<div class="text-xs text-muted-foreground">
			Currency: <span class="font-mono font-medium text-foreground">{uiState.currency} ({uiState.currencySymbol})</span>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-24">
			<div class="flex flex-col items-center gap-2 text-muted-foreground">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
				<span class="text-xs">Computing analytical distributions…</span>
			</div>
		</div>

	{:else if error}
		<div class="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs">
			<AlertCircle class="w-4 h-4 shrink-0" />
			<p class="font-medium">{error}</p>
			<button onclick={() => fetchAnalytics({ currency: uiState.currency })} class="ml-auto underline hover:no-underline font-semibold">Retry</button>
		</div>

	{:else if !analytics || analytics.transactionCount === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center gap-3 bg-card border border-border/70 rounded-xl p-8">
			<div class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
				<BarChart3 class="w-5 h-5" />
			</div>
			<div>
				<h2 class="text-sm font-semibold text-foreground">No records matching active criteria</h2>
				<p class="text-muted-foreground text-xs mt-0.5 max-w-sm">Try broadening your date filter or switch currency settings ({uiState.currency}).</p>
			</div>
			<a href="/transactions?new=true" class="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs">
				Record Entry
			</a>
		</div>

	{:else}
		<!-- KPI Summary Row -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each [
				{ label: 'Cumulative Inflow', value: analytics.totalIncome, color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: TrendingUp },
				{ label: 'Cumulative Outflow', value: analytics.totalExpenses, color: 'text-foreground', bg: 'bg-destructive/10', Icon: TrendingDown },
				{ label: 'Net Capital Retained', value: analytics.totalSavings, color: analytics.totalSavings >= 0 ? 'text-primary' : 'text-destructive', bg: 'bg-primary/10', Icon: Wallet },
				{ label: 'Health Score', value: analytics.healthScore, suffix: '/100', color: analytics.healthScore >= 60 ? 'text-emerald-400' : 'text-amber-400', bg: 'bg-amber-500/10', Icon: Activity },
			] as kpi}
				<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
					<div class="flex items-center justify-between mb-2">
						<p class="text-xs font-medium text-muted-foreground">{kpi.label}</p>
						<kpi.Icon class="w-3.5 h-3.5 {kpi.color}" />
					</div>
					<p class="text-xl font-semibold tracking-tight font-mono {kpi.color}">
						{kpi.suffix ? kpi.value : fmt(kpi.value)}{kpi.suffix ?? ''}
					</p>
				</div>
			{/each}
		</div>

		<!-- Main Charts Row -->
		<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
			<!-- Monthly Bar Chart -->
			<div class="lg:col-span-3 p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
				<div class="mb-4">
					<div class="flex items-center gap-2">
						<BarChart3 class="w-4 h-4 text-primary" />
						<h2 class="font-medium text-xs text-muted-foreground">Monthly Inflow vs Outflow</h2>
					</div>
				</div>

				{#if analytics.monthlyTrend.length === 0}
					<div class="flex items-center justify-center h-48 text-muted-foreground text-xs">Insufficient monthly data</div>
				{:else}
					<div class="flex-1 min-h-[220px]">
						<MonthlyChart data={analytics.monthlyTrend} fmt={fmt} />
					</div>
				{/if}
			</div>

			<!-- Pie Chart -->
			<div class="lg:col-span-2 p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
				<div class="mb-3">
					<div class="flex items-center gap-2">
						<PieChart class="w-4 h-4 text-primary" />
						<h2 class="font-medium text-xs text-muted-foreground">Category Concentration</h2>
					</div>
				</div>

				{#if analytics.categoryBreakdown.length === 0}
					<div class="flex items-center justify-center h-48 text-muted-foreground text-xs">No category data</div>
				{:else}
					<div class="flex flex-col gap-3">
						<div class="h-36 relative">
							<DoughnutChart data={analytics.categoryBreakdown} fmt={fmt} />
						</div>

						<!-- Legend -->
						<div class="w-full space-y-1 max-h-32 overflow-y-auto pr-1">
							{#each pieSlices as slice}
								<div class="flex items-center gap-2 text-xs">
									<span class="w-2 h-2 rounded-xs shrink-0" style="background:{slice.color}"></span>
									<span class="flex-1 text-muted-foreground truncate">{slice.name}</span>
									<span class="font-mono font-medium text-foreground">{fmt(slice.total)}</span>
									<span class="text-muted-foreground w-8 text-right font-mono text-[11px]">{Math.round(slice.pct * 100)}%</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Weekly Trend + Savings Velocity -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Weekly Bar Chart -->
			<div class="lg:col-span-2 p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
				<div class="mb-3">
					<div class="flex items-center gap-2">
						<Calendar class="w-4 h-4 text-primary" />
						<h2 class="font-medium text-xs text-muted-foreground">Weekly Velocity</h2>
					</div>
				</div>

				{#if analytics.weeklyTrend.length === 0}
					<div class="flex items-center justify-center h-32 text-muted-foreground text-xs">No weekly activity</div>
				{:else}
					<div class="flex-1 min-h-[140px]">
						<WeeklyChart data={analytics.weeklyTrend} fmt={fmt} />
					</div>
				{/if}
			</div>

			<!-- Savings Velocity Card -->
			<div class="p-5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<TrendingUp class="w-4 h-4 text-emerald-400" />
					<h2 class="font-medium text-xs text-muted-foreground">Retention Velocity</h2>
				</div>

				<div class="flex-1 flex flex-col items-center justify-center gap-2 py-2">
					<div class="relative w-28 h-28">
						<svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
							<circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border, #1f2537)" stroke-width="8" />
							<circle
								cx="50" cy="50" r="40" fill="none"
								stroke={savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444'}
								stroke-width="8"
								stroke-linecap="round"
								stroke-dasharray="{(savingsRate / 100) * 251.2} 251.2"
								class="transition-all duration-700"
							/>
						</svg>
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<p class="text-xl font-bold font-mono text-foreground">{savingsRate}%</p>
							<p class="text-[10px] text-muted-foreground">retained</p>
						</div>
					</div>
					<div class="text-center space-y-0.5">
						<p class="text-xs text-muted-foreground">of <span class="font-mono font-medium text-foreground">{fmt(analytics.totalIncome)}</span> inflow</p>
						<p class="text-[11px] text-muted-foreground">
							{savingsRate >= 20 ? 'Optimal capital accumulation' : savingsRate >= 10 ? 'Acceptable buffer velocity' : 'Low retention rate'}
						</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
					<div class="p-2 rounded-lg bg-secondary/40 text-center">
						<p class="text-muted-foreground text-[11px]">Monthly Average</p>
						<p class="font-mono font-medium text-foreground mt-0.5">
							{analytics.monthlyTrend.length > 0
								? fmt(analytics.monthlyTrend.reduce((s, m) => s + m.expenses, 0) / analytics.monthlyTrend.length)
								: fmt(0)}
						</p>
					</div>
					<div class="p-2 rounded-lg bg-secondary/40 text-center">
						<p class="text-muted-foreground text-[11px]">Ledger Entries</p>
						<p class="font-mono font-medium text-foreground mt-0.5">{analytics.transactionCount}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- This Month vs Last Month -->
		<div class="p-5 rounded-xl bg-card border border-border/70 shadow-xs">
			<div class="flex items-center gap-2 mb-3">
				<ArrowUpRight class="w-4 h-4 text-primary" />
				<h2 class="font-medium text-xs text-muted-foreground">Period Comparison (M/M)</h2>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each [
					{ label: 'Inflow', current: analytics.thisMonth.income, prev: analytics.lastMonth.income, good: true },
					{ label: 'Outflow', current: analytics.thisMonth.expenses, prev: analytics.lastMonth.expenses, good: false },
					{ label: 'Net Cash Flow', current: analytics.thisMonth.cashFlow, prev: analytics.lastMonth.income - analytics.lastMonth.expenses, good: true },
				] as item}
					{@const diff = item.current - item.prev}
					{@const pct = item.prev > 0 ? ((diff / item.prev) * 100).toFixed(1) : '—'}
					{@const positive = diff >= 0}
					{@const isGood = item.good ? positive : !positive}
					<div class="p-3.5 rounded-lg bg-secondary/40 border border-border/50">
						<p class="text-xs text-muted-foreground mb-1">{item.label}</p>
						<p class="text-lg font-semibold font-mono text-foreground">{fmt(item.current)}</p>
						<div class="flex items-center gap-1.5 mt-1 text-xs">
							{#if diff >= 0}
								<ArrowUpRight class="w-3.5 h-3.5 {isGood ? 'text-emerald-400' : 'text-destructive'}" />
							{:else}
								<ArrowDownRight class="w-3.5 h-3.5 {isGood ? 'text-emerald-400' : 'text-destructive'}" />
							{/if}
							<span class="{isGood ? 'text-emerald-400' : 'text-destructive'} font-mono font-medium">
								{pct === '—' ? '—' : `${positive ? '+' : ''}${pct}%`}
							</span>
							<span class="text-muted-foreground text-[11px]">vs prior cycle</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
