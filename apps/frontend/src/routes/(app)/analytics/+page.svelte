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
		Activity,
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
	// Total for pie chart
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
	<meta name="description" content="Deep financial insights and spending analytics powered by AI." />
</svelte:head>

<div class="space-y-6 max-w-7xl">
	<!-- Header -->
	<header class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Analytics</h1>
			<p class="text-muted-foreground mt-1 text-sm">Deep insights into your financial patterns.</p>
		</div>
		<button
			onclick={() => fetchAnalytics({ currency: uiState.currency })}
			class="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-all"
		>
			<Activity class="w-4 h-4" />
			Refresh
		</button>
	</header>

	<!-- Filters Toolbar -->
	<div class="flex flex-wrap gap-4 items-center justify-between p-4 bg-card border border-border/60 rounded-2xl shadow-sm">
		<div class="flex flex-wrap gap-5 items-center">
			<!-- Date Range Quick Filter -->
			<div class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Date Range</span>
				<div class="flex p-0.5 rounded-xl bg-secondary/40 border border-border/40">
					{#each [
						{ label: 'All Time', value: 'all' },
						{ label: '30 Days', value: '30days' },
						{ label: '6 Months', value: '6months' },
						{ label: '1 Year', value: '1year' }
					] as opt}
						<button
							onclick={() => (dateRange = opt.value as any)}
							class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
								{dateRange === opt.value ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/45'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Category Filter -->
			<div class="flex flex-col gap-1 min-w-[150px]">
				<span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Category</span>
				<select
					bind:value={selectedCategory}
					class="bg-secondary/40 text-xs border border-border/40 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/45 cursor-pointer text-muted-foreground hover:text-foreground transition-all"
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
		<div class="text-right p-1">
			<span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Active Currency</span>
			<span class="text-sm font-bold text-primary">{uiState.currency} ({uiState.currencySymbol})</span>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-32">
			<div class="flex flex-col items-center gap-3 text-muted-foreground">
				<Loader2 class="w-9 h-9 animate-spin text-primary" />
				<p class="text-sm">Loading analytics…</p>
			</div>
		</div>

	{:else if error}
		<div class="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
			<AlertCircle class="w-5 h-5 shrink-0" />
			<p class="text-sm font-medium">{error}</p>
			<button onclick={() => fetchAnalytics({ currency: uiState.currency })} class="ml-auto text-sm underline hover:no-underline">Retry</button>
		</div>

	{:else if !analytics || analytics.transactionCount === 0}
		<div class="flex flex-col items-center justify-center py-32 text-center gap-4">
			<div class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
				<BarChart3 class="w-10 h-10 text-primary" />
			</div>
			<div>
				<h2 class="text-xl font-bold">No data matching filters</h2>
				<p class="text-muted-foreground text-sm mt-1 max-w-sm">Try broadening your filters or add transactions in the selected currency ({uiState.currency}).</p>
			</div>
			<a href="/transactions?new=true" class="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
				Add Transaction
			</a>
		</div>

	{:else}
		<!-- ── KPI Summary Row ──────────────────────────────────────────────────── -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each [
				{ label: 'Total Income', value: analytics.totalIncome, color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: TrendingUp },
				{ label: 'Total Expenses', value: analytics.totalExpenses, color: 'text-red-400', bg: 'bg-red-500/10', Icon: TrendingDown },
				{ label: 'Net Savings', value: analytics.totalSavings, color: analytics.totalSavings >= 0 ? 'text-indigo-400' : 'text-destructive', bg: 'bg-indigo-500/10', Icon: Wallet },
				{ label: 'Health Score', value: analytics.healthScore, suffix: '/100', color: analytics.healthScore >= 60 ? 'text-emerald-400' : 'text-amber-400', bg: 'bg-amber-500/10', Icon: Activity },
			] as kpi}
				<div class="p-5 rounded-2xl bg-card border border-border/60 shadow-sm hover:border-primary/20 transition-all">
					<div class="flex items-center justify-between mb-3">
						<p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
						<div class="w-8 h-8 rounded-lg {kpi.bg} flex items-center justify-center">
							<kpi.Icon class="w-4 h-4 {kpi.color}" />
						</div>
					</div>
					<p class="text-2xl font-bold tracking-tight {kpi.color}">
						{kpi.suffix ? kpi.value : fmt(kpi.value)}{kpi.suffix ?? ''}
					</p>
				</div>
			{/each}
		</div>

		<!-- ── Main Charts Row ──────────────────────────────────────────────────── -->
		<div class="grid grid-cols-1 lg:grid-cols-5 gap-5">

			<!-- Monthly Bar Chart -->
			<div class="lg:col-span-3 p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<BarChart3 class="w-4 h-4 text-primary" />
						<h2 class="font-semibold text-sm">Monthly Income vs Expenses</h2>
					</div>
					<p class="text-xs text-muted-foreground mb-5">Chronological comparison</p>
				</div>

				{#if analytics.monthlyTrend.length === 0}
					<div class="flex items-center justify-center h-48 text-muted-foreground text-sm">No monthly data yet</div>
				{:else}
					<div class="flex-1 min-h-[220px]">
						<MonthlyChart data={analytics.monthlyTrend} fmt={fmt} />
					</div>
				{/if}
			</div>

			<!-- Pie Chart -->
			<div class="lg:col-span-2 p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<PieChart class="w-4 h-4 text-indigo-400" />
						<h2 class="font-semibold text-sm">Category Breakdown</h2>
					</div>
					<p class="text-xs text-muted-foreground mb-4">Spending distribution</p>
				</div>

				{#if analytics.categoryBreakdown.length === 0}
					<div class="flex items-center justify-center h-48 text-muted-foreground text-sm">No category data</div>
				{:else}
					<div class="flex flex-col gap-4">
						<div class="h-40 relative">
							<DoughnutChart data={analytics.categoryBreakdown} fmt={fmt} />
						</div>

						<!-- Legend -->
						<div class="w-full space-y-1.5 max-h-36 overflow-y-auto pr-1">
							{#each pieSlices as slice}
								<div class="flex items-center gap-2 text-xs">
									<span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:{slice.color}"></span>
									<span class="flex-1 text-muted-foreground truncate">{slice.name}</span>
									<span class="font-semibold">{fmt(slice.total)}</span>
									<span class="text-muted-foreground w-8 text-right">{Math.round(slice.pct * 100)}%</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- ── Weekly Trend + Savings Rate ──────────────────────────────────────── -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

			<!-- Weekly Bar Chart -->
			<div class="lg:col-span-2 p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<Calendar class="w-4 h-4 text-amber-400" />
						<h2 class="font-semibold text-sm">Weekly Activity</h2>
					</div>
					<p class="text-xs text-muted-foreground mb-5">Current & recent weeks</p>
				</div>

				{#if analytics.weeklyTrend.length === 0}
					<div class="flex items-center justify-center h-36 text-muted-foreground text-sm">No weekly data</div>
				{:else}
					<div class="flex-1 min-h-[140px]">
						<WeeklyChart data={analytics.weeklyTrend} fmt={fmt} />
					</div>
				{/if}
			</div>

			<!-- Savings Rate Card -->
			<div class="p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-4">
				<div class="flex items-center gap-2">
					<TrendingUp class="w-4 h-4 text-emerald-400" />
					<h2 class="font-semibold text-sm">Savings Rate</h2>
				</div>

				<!-- Big number -->
				<div class="flex-1 flex flex-col items-center justify-center gap-3 py-4">
					<div class="relative w-32 h-32">
						<svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
							<circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border, #222)" stroke-width="10" />
							<circle
								cx="50" cy="50" r="40" fill="none"
								stroke={savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444'}
								stroke-width="10"
								stroke-linecap="round"
								stroke-dasharray="{(savingsRate / 100) * 251.2} 251.2"
								class="transition-all duration-1000"
							/>
						</svg>
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<p class="text-2xl font-bold">{savingsRate}%</p>
							<p class="text-[10px] text-muted-foreground">saved</p>
						</div>
					</div>
					<div class="text-center space-y-1">
						<p class="text-sm text-muted-foreground">of <span class="font-semibold text-foreground">{fmt(analytics.totalIncome)}</span> income</p>
						<p class="text-xs text-muted-foreground">
							{savingsRate >= 20 ? '🟢 Excellent! Keep it up.' : savingsRate >= 10 ? '🟡 Good, aim for 20%.' : '🔴 Try to save more.'}
						</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs">
					<div class="p-2.5 rounded-xl bg-secondary/40 text-center">
						<p class="text-muted-foreground">Avg/Month</p>
						<p class="font-semibold mt-0.5">
							{analytics.monthlyTrend.length > 0
								? fmt(analytics.monthlyTrend.reduce((s, m) => s + m.expenses, 0) / analytics.monthlyTrend.length)
								: fmt(0)}
						</p>
					</div>
					<div class="p-2.5 rounded-xl bg-secondary/40 text-center">
						<p class="text-muted-foreground">Transactions</p>
						<p class="font-semibold mt-0.5">{analytics.transactionCount}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- ── This Month vs Last Month ─────────────────────────────────────────── -->
		<div class="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
			<div class="flex items-center gap-2 mb-4">
				<ArrowUpRight class="w-4 h-4 text-primary" />
				<h2 class="font-semibold text-sm">This Month vs Last Month</h2>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{#each [
					{ label: 'Income', current: analytics.thisMonth.income, prev: analytics.lastMonth.income, good: true },
					{ label: 'Expenses', current: analytics.thisMonth.expenses, prev: analytics.lastMonth.expenses, good: false },
					{ label: 'Cash Flow', current: analytics.thisMonth.cashFlow, prev: analytics.lastMonth.income - analytics.lastMonth.expenses, good: true },
				] as item}
					{@const diff = item.current - item.prev}
					{@const pct = item.prev > 0 ? ((diff / item.prev) * 100).toFixed(1) : '—'}
					{@const positive = diff >= 0}
					{@const isGood = item.good ? positive : !positive}
					<div class="p-4 rounded-xl bg-secondary/30 border border-border/40">
						<p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">{item.label}</p>
						<p class="text-xl font-bold">{fmt(item.current)}</p>
						<div class="flex items-center gap-1.5 mt-1.5">
							{#if diff >= 0}
								<ArrowUpRight class="w-3 h-3 {isGood ? 'text-emerald-400' : 'text-red-400'}" />
							{:else}
								<ArrowDownRight class="w-3 h-3 {isGood ? 'text-emerald-400' : 'text-red-400'}" />
							{/if}
							<span class="text-xs {isGood ? 'text-emerald-400' : 'text-red-400'} font-semibold">
								{pct === '—' ? '—' : `${positive ? '+' : ''}${pct}%`}
							</span>
							<span class="text-xs text-muted-foreground">vs last month</span>
						</div>
						<p class="text-xs text-muted-foreground mt-1">Last: {fmt(item.prev)}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- ── Top Categories Table ─────────────────────────────────────────────── -->
		{#if analytics.categoryBreakdown.length > 0}
			<div class="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
				<div class="flex items-center gap-2 mb-4">
					<PieChart class="w-4 h-4 text-indigo-400" />
					<h2 class="font-semibold text-sm">Top Spending Categories</h2>
				</div>
				<div class="space-y-3">
					{#each analytics.categoryBreakdown.slice(0, 6) as cat}
						{@const pct = totalCategorySpend > 0 ? (cat.total / totalCategorySpend) * 100 : 0}
						<div class="space-y-1">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{cat.color}"></span>
									<span class="font-medium">{cat.name}</span>
									<span class="text-xs text-muted-foreground">{cat.count} txn{cat.count !== 1 ? 's' : ''}</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
									<span class="font-semibold text-sm">{fmt(cat.total)}</span>
								</div>
							</div>
							<div class="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-700"
									style="width:{pct}%; background:{cat.color}"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
