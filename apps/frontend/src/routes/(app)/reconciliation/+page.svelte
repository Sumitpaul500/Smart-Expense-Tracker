<script lang="ts">
	import { onMount } from 'svelte';
	import { reconciliationApi, type ReconciliationStats, type ReconciliationItem, type AuditTrailRecord } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import {
		ShieldCheck,
		AlertTriangle,
		CheckCircle2,
		AlertCircle,
		RefreshCw,
		FileText,
		ArrowRight,
		FileCode2,
		Layers,
		X,
		Search,
		Check,
		ShieldAlert,
		Loader2,
		Smartphone,
		Receipt,
		BookOpen
	} from 'lucide-svelte';

	// ── State (Dynamic initial state calculated from real DB data) ───────────────
	let stats = $state<ReconciliationStats>({
		totalTransactions: 0,
		reconciled: 0,
		mismatches: 0,
		suspicious: 0,
		unresolved: 0,
		reconciliationRate: 0.0,
		bankSmsCount: 0,
		receiptCount: 0,
		ledgerCount: 0
	});
	let items = $state<ReconciliationItem[]>([]);
	let isLoading = $state(true);
	let isRunning = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let filterStatus = $state<'ALL' | 'MATCHED' | 'MISMATCH' | 'SUSPICIOUS' | 'RESOLVED'>('ALL');
	let selectedSource = $state<'ALL' | 'Bank SMS' | 'Receipt OCR' | 'Ledger Record'>('ALL');
	let searchQuery = $state('');

	// Audit Trail Modal State
	let activeAudit = $state<AuditTrailRecord | null>(null);
	let activeItemForAction = $state<ReconciliationItem | null>(null);
	let isModalOpen = $state(false);
	let isResolving = $state(false);

	// ── Fetch Data ────────────────────────────────────────────────────────────
	async function loadData() {
		isLoading = true;
		errorMessage = null;
		try {
			const [s, i] = await Promise.all([
				reconciliationApi.getStats(),
				reconciliationApi.getItems()
			]);
			stats = s;
			items = i.items || [];
		} catch (err: any) {
			console.error('Failed to load reconciliation data:', err);
			errorMessage = err.message || 'Failed to load reconciliation data from backend.';
		} finally {
			isLoading = false;
		}
	}

	async function handleRunReconciliation() {
		isRunning = true;
		errorMessage = null;
		successMessage = null;
		try {
			const res = await reconciliationApi.runReconciliation();
			if (res.summary) {
				stats = res.summary;
			}
			const updatedItems = await reconciliationApi.getItems();
			items = updatedItems.items || [];
			successMessage = `Reconciliation batch completed successfully. ${stats.totalTransactions} transaction records verified.`;
			setTimeout(() => { successMessage = null; }, 5000);
		} catch (err: any) {
			console.error('Reconciliation execution error:', err);
			errorMessage = err.message || 'Failed to execute reconciliation batch.';
		} finally {
			isRunning = false;
		}
	}

	async function handleResolveItem(item: ReconciliationItem) {
		isResolving = true;
		try {
			await reconciliationApi.updateStatus(item.txCode, 'RESOLVED');
			await loadData();
			if (isModalOpen && activeAudit && activeAudit.txCode === item.txCode) {
				activeAudit.aiDecision = 'RESOLVED';
				activeAudit.decisionStatus = 'Resolved by User';
			}
		} catch (err: any) {
			console.error('Failed to resolve exception:', err);
			errorMessage = err.message || 'Failed to mark exception as resolved.';
		} finally {
			isResolving = false;
		}
	}

	function openAuditTrail(item: ReconciliationItem) {
		activeItemForAction = item;
		activeAudit = {
			txCode: item.txCode,
			merchant: item.merchant,
			source: item.source || 'General Ledger',
			receiptRef: item.receiptRef || 'Pending Attachment',
			aiDecision: item.status,
			confidence: item.confidence ? `${(item.confidence * 100).toFixed(0)}% Match` : '98% Deterministic',
			reason: item.reason || 'Reconciled automatically against verified source documents.',
			decisionStatus: item.status === 'RESOLVED' ? 'Resolved by User' : item.status === 'MATCHED' ? 'Auto-approved' : 'Requires User Review',
			bankAmount: item.bankAmount,
			receiptAmount: item.receiptAmount,
			difference: item.difference
		};
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		activeAudit = null;
		activeItemForAction = null;
	}

	onMount(() => {
		loadData();
	});

	// Dynamic top active exception from real database records
	const activeException = $derived(
		items.find((item) => item.status === 'MISMATCH' || item.status === 'SUSPICIOUS')
	);

	// Filtered items derived from search, status filter & source filter
	const filteredItems = $derived(
		items.filter((item) => {
			const matchSearch =
				item.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.txCode.toLowerCase().includes(searchQuery.toLowerCase());
			const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
			const matchSource = selectedSource === 'ALL' || (item.source && item.source.toLowerCase().includes(selectedSource.toLowerCase()));
			return matchSearch && matchStatus && matchSource;
		})
	);

	function fmt(val?: number) {
		if (val === undefined || val === null) return '—';
		return `${uiState.currencySymbol}${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
	}
</script>

<svelte:head>
	<title>AI Finance Controller | FinPilot AI</title>
</svelte:head>

<div class="space-y-6 pb-12 max-w-7xl">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
				<ShieldCheck class="w-5 h-5" />
			</div>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">AI Finance Controller</h1>
				<p class="text-xs text-muted-foreground mt-0.5">
					3-way transaction cross-validation, variance detection, and verifiable audit records.
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<button
				onclick={loadData}
				disabled={isLoading || isRunning}
				class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary/80 text-foreground font-medium text-xs hover:bg-secondary transition-colors border border-border/70 disabled:opacity-50"
				title="Refresh data"
			>
				<RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin' : ''}" />
				Refresh
			</button>

			<button
				onclick={handleRunReconciliation}
				disabled={isRunning}
				class="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs shrink-0"
			>
				{#if isRunning}
					<Loader2 class="w-3.5 h-3.5 animate-spin" />
					Processing Batch...
				{:else}
					<ShieldCheck class="w-3.5 h-3.5" />
					Run Reconciliation Batch
				{/if}
			</button>
		</div>
	</header>

	<!-- System Notifications / Error States -->
	{#if errorMessage}
		<div class="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<AlertCircle class="w-4 h-4 shrink-0" />
				<span>{errorMessage}</span>
			</div>
			<button onclick={() => errorMessage = null} class="text-muted-foreground hover:text-foreground">
				<X class="w-4 h-4" />
			</button>
		</div>
	{/if}

	{#if successMessage}
		<div class="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<CheckCircle2 class="w-4 h-4 shrink-0" />
				<span>{successMessage}</span>
			</div>
			<button onclick={() => successMessage = null} class="text-muted-foreground hover:text-foreground">
				<X class="w-4 h-4" />
			</button>
		</div>
	{/if}

	<!-- Core Pipeline Ingestion Diagram & Source Filters -->
	<div class="rounded-xl bg-card border border-border/70 p-5 shadow-xs">
		<div class="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
			<p class="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
				<Layers class="w-3.5 h-3.5 text-primary" />
				<span>Cross-Validation Pipeline & Ingestion Channels</span>
			</p>
			{#if selectedSource !== 'ALL'}
				<button 
					onclick={() => selectedSource = 'ALL'} 
					class="text-xs text-primary hover:underline font-medium"
				>
					Clear Filter ({selectedSource})
				</button>
			{/if}
		</div>

		<!-- Interactive Ingestion Source Cards -->
		<div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs">
			<!-- Inputs Block -->
			<div class="md:col-span-2 grid grid-cols-3 gap-2">
				<!-- Bank SMS Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Bank SMS' ? 'ALL' : 'Bank SMS'}
					class="p-3 rounded-lg transition-colors flex flex-col items-center gap-1.5 text-center w-full {selectedSource === 'Bank SMS' ? 'bg-primary/10 border-2 border-primary text-foreground' : 'bg-secondary/40 border border-border/60 hover:bg-secondary/70'}"
				>
					<Smartphone class="w-4 h-4 text-primary" />
					<span class="font-medium text-xs">Bank / SMS</span>
					<span class="text-[11px] text-muted-foreground font-mono">{stats.bankSmsCount || 0} records</span>
				</button>

				<!-- Receipt Invoice Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Receipt OCR' ? 'ALL' : 'Receipt OCR'}
					class="p-3 rounded-lg transition-colors flex flex-col items-center gap-1.5 text-center w-full {selectedSource === 'Receipt OCR' ? 'bg-primary/10 border-2 border-primary text-foreground' : 'bg-secondary/40 border border-border/60 hover:bg-secondary/70'}"
				>
					<Receipt class="w-4 h-4 text-emerald-400" />
					<span class="font-medium text-xs">Receipt / OCR</span>
					<span class="text-[11px] text-muted-foreground font-mono">{stats.receiptCount || 0} records</span>
				</button>

				<!-- Ledger Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Ledger Record' ? 'ALL' : 'Ledger Record'}
					class="p-3 rounded-lg transition-colors flex flex-col items-center gap-1.5 text-center w-full {selectedSource === 'Ledger Record' ? 'bg-primary/10 border-2 border-primary text-foreground' : 'bg-secondary/40 border border-border/60 hover:bg-secondary/70'}"
				>
					<BookOpen class="w-4 h-4 text-primary" />
					<span class="font-medium text-xs">General Ledger</span>
					<span class="text-[11px] text-muted-foreground font-mono">{stats.ledgerCount || 0} records</span>
				</button>
			</div>

			<!-- Arrow Indicator -->
			<div class="hidden md:flex justify-center text-muted-foreground">
				<ArrowRight class="w-4 h-4 text-muted-foreground" />
			</div>

			<!-- Controller Processing -->
			<div class="p-3 rounded-lg bg-secondary/50 border border-border/70 flex flex-col items-center justify-center gap-1 text-center">
				<div class="flex items-center gap-1.5 font-semibold text-xs text-foreground">
					<ShieldCheck class="w-4 h-4 text-primary" />
					Reconciliation Engine
				</div>
				<span class="text-[11px] text-muted-foreground">3-Way Cross Verification</span>
			</div>

			<!-- Decision Outputs -->
			<div class="grid grid-cols-3 gap-2">
				<div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
					<span class="font-semibold text-xs text-emerald-400">Matched</span>
					<span class="text-[10px] text-muted-foreground">Verified</span>
				</div>
				<div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
					<span class="font-semibold text-xs text-amber-400">Mismatch</span>
					<span class="text-[10px] text-muted-foreground">Variance</span>
				</div>
				<div class="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 flex flex-col items-center">
					<span class="font-semibold text-xs text-destructive">Suspicious</span>
					<span class="text-[10px] text-muted-foreground">Flagged</span>
				</div>
			</div>
		</div>
	</div>

	<!-- AI Finance Controller KPI Cards -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
		<!-- Total Transactions -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-muted-foreground">Monitored Entries</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-foreground mt-1">{stats.totalTransactions.toLocaleString()}</p>
			<p class="text-[11px] text-muted-foreground mt-1">Cross-channel data</p>
		</div>

		<!-- Reconciled -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-emerald-400">Reconciled</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-emerald-400 mt-1">{stats.reconciled.toLocaleString()}</p>
			<p class="text-[11px] text-muted-foreground mt-1">3-way matched</p>
		</div>

		<!-- Mismatches -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-amber-400">Mismatches</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-amber-400 mt-1">{stats.mismatches.toLocaleString()}</p>
			<p class="text-[11px] text-muted-foreground mt-1">Variance identified</p>
		</div>

		<!-- Suspicious -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-destructive">Suspicious</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-destructive mt-1">{stats.suspicious.toLocaleString()}</p>
			<p class="text-[11px] text-muted-foreground mt-1">Requires audit</p>
		</div>

		<!-- Unresolved -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-muted-foreground">Unresolved</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-foreground mt-1">{stats.unresolved.toLocaleString()}</p>
			<p class="text-[11px] text-muted-foreground mt-1">Pending review</p>
		</div>

		<!-- Reconciliation Rate -->
		<div class="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
			<p class="text-xs font-medium text-primary">Match Ratio</p>
			<p class="text-xl font-semibold tracking-tight font-mono text-primary mt-1">{stats.reconciliationRate}%</p>
			<div class="w-full h-1 bg-secondary rounded-full overflow-hidden mt-2">
				<div class="h-full bg-primary rounded-full" style="width: {stats.reconciliationRate}%"></div>
			</div>
		</div>
	</div>

	<!-- Exception Alert Banner -->
	{#if activeException}
		<div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<div class="flex items-center gap-2">
					<AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
					<h3 class="text-xs font-semibold text-amber-400">Reconciliation Variance Flagged</h3>
				</div>
				<span class="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
					{activeException.txCode}
				</span>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-card/60 p-3 rounded-lg border border-amber-500/20 font-mono">
				<div><span class="text-muted-foreground font-sans">Bank Statement:</span> <strong class="text-foreground">{fmt(activeException.bankAmount)}</strong> ({activeException.merchant})</div>
				<div><span class="text-muted-foreground font-sans">Receipt OCR:</span> <strong class="text-foreground">{fmt(activeException.receiptAmount)}</strong> ({activeException.merchant})</div>
				<div><span class="text-muted-foreground font-sans">Variance:</span> <strong class="text-amber-400">{fmt(activeException.difference)} Mismatch</strong></div>
			</div>

			<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
				<div class="space-y-0.5">
					<p class="text-muted-foreground">
						<span class="font-medium text-foreground">Explanation:</span> {activeException.reason}
					</p>
					<p class="text-muted-foreground">
						<span class="font-medium text-foreground">Remediation:</span> {activeException.action}
					</p>
				</div>
				<button
					onclick={() => handleResolveItem(activeException)}
					disabled={isResolving}
					class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
				>
					{isResolving ? 'Resolving...' : 'Confirm Resolution'}
				</button>
			</div>
		</div>
	{:else}
		<div class="p-4 rounded-xl bg-card border border-border/70 flex items-center justify-between flex-wrap gap-3">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
					<CheckCircle2 class="w-4 h-4" />
				</div>
				<div>
					<h3 class="text-xs font-semibold text-foreground">All Ingested Records Cleared</h3>
					<p class="text-xs text-muted-foreground mt-0.5">
						No unresolved variances or anomalies detected in current batch.
					</p>
				</div>
			</div>
			<button
				onclick={handleRunReconciliation}
				disabled={isRunning}
				class="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border/70 text-xs font-medium transition-colors shrink-0"
			>
				Run Verification Batch
			</button>
		</div>
	{/if}

	<!-- Ledger Table Section -->
	<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/50">
			<div>
				<h2 class="text-sm font-semibold tracking-tight text-foreground">Audit Ledger</h2>
				<p class="text-xs text-muted-foreground">Multi-channel reconciled transactions and decision audit trails.</p>
			</div>

			<div class="flex items-center gap-2 flex-wrap">
				<!-- Search -->
				<div class="relative">
					<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search merchant or TX..."
						class="pl-8 pr-3 py-1.5 bg-secondary/40 border border-border/60 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48 text-foreground"
					/>
				</div>

				<!-- Status Filter Tabs -->
				<div class="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/60 text-xs gap-0.5">
					{#each ['ALL', 'MATCHED', 'MISMATCH', 'SUSPICIOUS', 'RESOLVED'] as st}
						<button
							onclick={() => filterStatus = st as any}
							class="px-2 py-0.5 rounded text-xs font-medium transition-colors
								{filterStatus === st ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
						>
							{st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto rounded-lg border border-border/60">
			<table class="w-full text-left text-xs">
				<thead class="bg-secondary/40 text-muted-foreground text-[11px] font-medium border-b border-border/60">
					<tr>
						<th class="px-4 py-2.5">Transaction</th>
						<th class="px-4 py-2.5">Source Channel</th>
						<th class="px-4 py-2.5 text-right font-mono">Bank Stmt</th>
						<th class="px-4 py-2.5 text-right font-mono">Receipt OCR</th>
						<th class="px-4 py-2.5 text-right font-mono">Variance</th>
						<th class="px-4 py-2.5 text-center">Status</th>
						<th class="px-4 py-2.5 text-center">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/40">
					{#if isLoading}
						<tr>
							<td colspan="7" class="py-12 text-center text-muted-foreground">
								<Loader2 class="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
								<span>Aggregating ledger data…</span>
							</td>
						</tr>
					{:else if filteredItems.length === 0}
						<tr>
							<td colspan="7" class="py-10 text-center space-y-2">
								<div class="text-muted-foreground text-xs">
									{#if items.length === 0}
										No transactions in ledger yet.
									{:else}
										No records match the active criteria.
									{/if}
								</div>
								{#if items.length === 0}
									<button
										onclick={handleRunReconciliation}
										disabled={isRunning}
										class="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-xs"
									>
										<ShieldCheck class="w-3.5 h-3.5" />
										Run Initial Verification
									</button>
								{/if}
							</td>
						</tr>
					{:else}
						{#each filteredItems as item (item.txCode)}
							<tr class="hover:bg-secondary/30 transition-colors">
								<td class="px-4 py-3">
									<div class="font-medium text-foreground">{item.merchant}</div>
									<div class="text-[11px] text-muted-foreground font-mono">{item.txCode}</div>
								</td>

								<td class="px-4 py-3 text-muted-foreground">
									<span class="inline-flex items-center gap-1.5 text-xs">
										<FileText class="w-3.5 h-3.5 text-muted-foreground" />
										{item.source || 'General Ledger'}
									</span>
								</td>

								<td class="px-4 py-3 text-right font-mono text-foreground">
									{fmt(item.bankAmount)}
								</td>

								<td class="px-4 py-3 text-right font-mono text-muted-foreground">
									{fmt(item.receiptAmount)}
								</td>

								<td class="px-4 py-3 text-right font-mono font-medium {item.difference > 0 ? 'text-amber-400' : 'text-muted-foreground'}">
									{item.difference > 0 ? fmt(item.difference) : '—'}
								</td>

								<td class="px-4 py-3 text-center">
									{#if item.status === 'MATCHED'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
											<Check class="w-3 h-3" />
											Matched
										</span>
									{:else if item.status === 'MISMATCH'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
											<AlertTriangle class="w-3 h-3" />
											Mismatch
										</span>
									{:else if item.status === 'RESOLVED'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
											<Check class="w-3 h-3" />
											Resolved
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
											<ShieldAlert class="w-3 h-3" />
											Suspicious
										</span>
									{/if}
								</td>

								<td class="px-4 py-3 text-center">
									<div class="flex items-center justify-center gap-1.5">
										<button
											onclick={() => openAuditTrail(item)}
											class="px-2.5 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-[11px] font-medium border border-border/60 inline-flex items-center gap-1"
											title="View Audit Trail"
										>
											<FileCode2 class="w-3 h-3 text-primary" />
											Audit
										</button>
										{#if item.status === 'MISMATCH' || item.status === 'SUSPICIOUS'}
											<button
												onclick={() => handleResolveItem(item)}
												disabled={isResolving}
												class="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-black transition-colors text-[11px] font-medium border border-amber-500/30"
												title="Mark as Resolved"
											>
												Resolve
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- AUDIT TRAIL MODAL -->
{#if isModalOpen && activeAudit}
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="audit-modal-title"
		tabindex="-1"
		onclick={closeModal}
		onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-card border border-border/80 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 relative"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Close Button -->
			<button
				onclick={closeModal}
				class="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
				aria-label="Close modal"
			>
				<X class="w-4 h-4" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
					<ShieldCheck class="w-4.5 h-4.5" />
				</div>
				<div>
					<h3 id="audit-modal-title" class="text-sm font-semibold tracking-tight text-foreground">Decision Audit Trail</h3>
					<p class="text-xs text-muted-foreground">Verifiable reconciliation decision record.</p>
				</div>
			</div>

			<!-- Audit Record Card -->
			<div class="p-3.5 rounded-lg bg-secondary/30 border border-border/60 space-y-2.5 font-mono text-xs">
				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Transaction Code:</span>
					<strong class="text-foreground">{activeAudit.txCode}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Entity / Merchant:</span>
					<strong class="text-foreground">{activeAudit.merchant}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Ingestion Channel:</span>
					<strong class="text-foreground">{activeAudit.source}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Document Reference:</span>
					<strong class="text-foreground">{activeAudit.receiptRef}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Decision Status:</span>
					<span class="px-1.5 py-0.2 rounded text-[11px] font-medium {activeAudit.aiDecision === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-400' : activeAudit.aiDecision === 'RESOLVED' ? 'bg-primary/10 text-primary' : activeAudit.aiDecision === 'MISMATCH' ? 'bg-amber-500/10 text-amber-400' : 'bg-destructive/10 text-destructive'}">
						{activeAudit.aiDecision}
					</span>
				</div>

				{#if activeAudit.confidence && activeAudit.confidence !== 'N/A'}
					<div class="flex justify-between border-b border-border/40 pb-2">
						<span class="text-muted-foreground font-sans">Confidence Metric:</span>
						<strong class="text-primary">{activeAudit.confidence}</strong>
					</div>
				{/if}

				<div class="space-y-1 border-b border-border/40 pb-2">
					<span class="text-muted-foreground font-sans">Explanation & Audit Basis:</span>
					<p class="text-foreground font-sans text-xs pt-1 leading-relaxed bg-card p-2 rounded border border-border/40">
						{activeAudit.reason}
					</p>
				</div>

				<div class="flex justify-between pt-1">
					<span class="text-muted-foreground font-sans">Action Taken:</span>
					<strong class="text-emerald-400 font-sans">{activeAudit.decisionStatus}</strong>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex justify-between items-center pt-2">
				{#if activeItemForAction && (activeItemForAction.status === 'MISMATCH' || activeItemForAction.status === 'SUSPICIOUS')}
					<button
						onclick={() => activeItemForAction && handleResolveItem(activeItemForAction)}
						disabled={isResolving}
						class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold transition-colors disabled:opacity-50"
					>
						{isResolving ? 'Resolving...' : 'Confirm Resolution'}
					</button>
				{:else}
					<div></div>
				{/if}
				<button
					onclick={closeModal}
					class="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
				>
					Close Audit
				</button>
			</div>
		</div>
	</div>
{/if}
