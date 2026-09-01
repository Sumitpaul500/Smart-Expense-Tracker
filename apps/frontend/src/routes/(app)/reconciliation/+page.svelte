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
		Sparkles,
		FileText,
		ArrowRight,
		FileCode2,
		Layers,
		Info,
		X,
		Search,
		Filter,
		Check,
		ShieldAlert,
		Loader2
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
			console.error('Failed to resolve item:', err);
			errorMessage = err.message || 'Failed to resolve reconciliation item.';
		} finally {
			isResolving = false;
		}
	}

	function openAuditTrail(item: ReconciliationItem) {
		activeItemForAction = item;
		activeAudit = {
			txCode: item.txCode,
			source: item.source || 'Ledger Record',
			receiptRef: item.receiptRef || 'N/A',
			aiDecision: item.status,
			confidence: item.confidence ? `${item.confidence}%` : 'N/A',
			reason: item.reason,
			decisionStatus: item.auditTrailStatus || (item.status === 'MATCHED' ? 'Automatically approved' : item.status === 'MISMATCH' ? 'Requires Review' : item.status === 'RESOLVED' ? 'Resolved by User' : 'Flagged for Audit'),
			merchant: item.merchant,
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

<div class="space-y-8 pb-12">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-600/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
					<ShieldCheck class="w-5 h-5" />
				</div>
				<div>
					<h1 class="text-2xl font-extrabold tracking-tight">AI Finance Controller</h1>
					<p class="text-xs text-muted-foreground mt-0.5">
						Reconcile transactions, detect discrepancies, and review financial exceptions.
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2.5 shrink-0">
			<button
				onclick={loadData}
				disabled={isLoading || isRunning}
				class="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary/80 text-foreground font-semibold text-xs hover:bg-secondary transition-all border border-border/60 disabled:opacity-50"
				title="Refresh data"
			>
				<RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin' : ''}" />
				Refresh
			</button>

			<button
				onclick={handleRunReconciliation}
				disabled={isRunning}
				class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 shrink-0"
			>
				{#if isRunning}
					<Loader2 class="w-4 h-4 animate-spin" />
					Running AI Controller...
				{:else}
					<Sparkles class="w-4 h-4" />
					Run AI Reconciliation Batch
				{/if}
			</button>
		</div>
	</div>

	<!-- System Notifications / Error States -->
	{#if errorMessage}
		<div class="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center justify-between gap-3">
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
		<div class="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3">
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
	<div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card via-card/90 to-card border border-border/60 p-6 shadow-xl">
		<div class="absolute -right-16 -top-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

		<div class="flex items-center justify-between mb-4">
			<p class="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
				<Layers class="w-3.5 h-3.5" />
				AI Finance Controller Pipeline
			</p>
			{#if selectedSource !== 'ALL'}
				<button 
					onclick={() => selectedSource = 'ALL'} 
					class="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
				>
					Reset Source Filter ({selectedSource}) ✕
				</button>
			{/if}
		</div>

		<!-- Interactive Ingestion Source Cards -->
		<div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center text-xs">
			<!-- Inputs Block -->
			<div class="md:col-span-2 grid grid-cols-3 gap-2">
				<!-- Bank SMS Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Bank SMS' ? 'ALL' : 'Bank SMS'}
					class="p-3 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer text-left w-full {selectedSource === 'Bank SMS' ? 'bg-primary/20 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/40' : 'bg-secondary/40 border border-border/50 hover:bg-secondary/70'}"
				>
					<div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
						📱
					</div>
					<span class="font-bold text-[11px]">Bank / SMS</span>
					<span class="text-[10px] text-muted-foreground font-mono font-semibold">{stats.bankSmsCount || 0} records</span>
				</button>

				<!-- Receipt Invoice Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Receipt OCR' ? 'ALL' : 'Receipt OCR'}
					class="p-3 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer text-left w-full {selectedSource === 'Receipt OCR' ? 'bg-primary/20 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/40' : 'bg-secondary/40 border border-border/50 hover:bg-secondary/70'}"
				>
					<div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
						🧾
					</div>
					<span class="font-bold text-[11px]">Receipt / OCR</span>
					<span class="text-[10px] text-muted-foreground font-mono font-semibold">{stats.receiptCount || 0} records</span>
				</button>

				<!-- Ledger Card -->
				<button
					onclick={() => selectedSource = selectedSource === 'Ledger Record' ? 'ALL' : 'Ledger Record'}
					class="p-3 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer text-left w-full {selectedSource === 'Ledger Record' ? 'bg-primary/20 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/40' : 'bg-secondary/40 border border-border/50 hover:bg-secondary/70'}"
				>
					<div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
						📖
					</div>
					<span class="font-bold text-[11px]">Ledger Record</span>
					<span class="text-[10px] text-muted-foreground font-mono font-semibold">{stats.ledgerCount || 0} records</span>
				</button>
			</div>

			<!-- Arrow -->
			<div class="hidden md:flex justify-center text-muted-foreground">
				<ArrowRight class="w-5 h-5 text-primary animate-pulse" />
			</div>

			<!-- Controller Processing -->
			<div class="p-3.5 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-purple-500/20 border border-primary/40 flex flex-col items-center justify-center gap-1 text-center shadow-lg">
				<div class="flex items-center gap-1.5 font-extrabold text-sm text-primary">
					<ShieldCheck class="w-4 h-4" />
					AI RECONCILIATION
				</div>
				<span class="text-[10px] text-muted-foreground">3-Way Cross Verification</span>
			</div>

			<!-- Decision Outputs -->
			<div class="grid grid-cols-3 gap-2">
				<div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center">
					<span class="font-extrabold text-[11px] text-emerald-400">MATCHED</span>
					<span class="text-[9px] text-muted-foreground">Auto Approved</span>
				</div>
				<div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center">
					<span class="font-extrabold text-[11px] text-amber-400">MISMATCH</span>
					<span class="text-[9px] text-muted-foreground">Variance Explain</span>
				</div>
				<div class="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col items-center">
					<span class="font-extrabold text-[11px] text-destructive">SUSPICIOUS</span>
					<span class="text-[9px] text-muted-foreground">Flagged Audit</span>
				</div>
			</div>
		</div>
	</div>

	<!-- AI Finance Controller Dashboard KPI Cards (Calculated dynamically) -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
		<!-- Total Transactions -->
		<div class="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
			<p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Transactions</p>
			<p class="text-2xl font-black tracking-tight">{stats.totalTransactions.toLocaleString()}</p>
			<p class="text-[10px] text-muted-foreground">Monitored Ingested Data</p>
		</div>

		<!-- Reconciled -->
		<div class="p-4 rounded-2xl bg-card border border-emerald-500/30 space-y-1 relative overflow-hidden">
			<div class="absolute right-2 top-2 w-2 h-2 rounded-full bg-emerald-400"></div>
			<p class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Reconciled</p>
			<p class="text-2xl font-black tracking-tight text-emerald-400">{stats.reconciled.toLocaleString()}</p>
			<p class="text-[10px] text-muted-foreground">✅ 3-Way Auto Matched</p>
		</div>

		<!-- Mismatches -->
		<div class="p-4 rounded-2xl bg-card border border-amber-500/30 space-y-1 relative overflow-hidden">
			<div class="absolute right-2 top-2 w-2 h-2 rounded-full bg-amber-400"></div>
			<p class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Mismatches</p>
			<p class="text-2xl font-black tracking-tight text-amber-400">{stats.mismatches.toLocaleString()}</p>
			<p class="text-[10px] text-muted-foreground">⚠️ Variance Detected</p>
		</div>

		<!-- Suspicious -->
		<div class="p-4 rounded-2xl bg-card border border-destructive/30 space-y-1 relative overflow-hidden">
			<div class="absolute right-2 top-2 w-2 h-2 rounded-full bg-destructive"></div>
			<p class="text-[11px] font-semibold text-destructive uppercase tracking-wider">Suspicious</p>
			<p class="text-2xl font-black tracking-tight text-destructive">{stats.suspicious.toLocaleString()}</p>
			<p class="text-[10px] text-muted-foreground">🚨 Security Anomaly</p>
		</div>

		<!-- Unresolved -->
		<div class="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
			<p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unresolved</p>
			<p class="text-2xl font-black tracking-tight">{stats.unresolved.toLocaleString()}</p>
			<p class="text-[10px] text-muted-foreground">Pending Human Action</p>
		</div>

		<!-- Reconciliation Rate -->
		<div class="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/40 space-y-1">
			<p class="text-[11px] font-semibold text-primary uppercase tracking-wider">Reconcile Rate</p>
			<p class="text-2xl font-black tracking-tight text-primary">{stats.reconciliationRate}%</p>
			<div class="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
				<div class="h-full bg-primary rounded-full" style="width: {stats.reconciliationRate}%"></div>
			</div>
		</div>
	</div>

	<!-- DYNAMIC RECONCILIATION EXCEPTION MONITOR (Strictly generated from real user records) -->
	{#if activeException}
		<div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<div class="flex items-center gap-2">
					<AlertTriangle class="w-5 h-5 text-amber-400 shrink-0" />
					<h3 class="text-sm font-bold text-amber-400">Reconciliation Exception Detected</h3>
				</div>
				<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
					Variance Case: {activeException.txCode}
				</span>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-background/50 p-3.5 rounded-xl border border-amber-500/20 font-mono">
				<div><span class="text-muted-foreground">Bank Statement:</span> <strong class="text-foreground">{fmt(activeException.bankAmount)}</strong> ({activeException.merchant})</div>
				<div><span class="text-muted-foreground">OCR Receipt:</span> <strong class="text-foreground">{fmt(activeException.receiptAmount)}</strong> ({activeException.merchant})</div>
				<div><span class="text-muted-foreground">Variance:</span> <strong class="text-amber-400">{fmt(activeException.difference)} Mismatch</strong></div>
			</div>

			<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pl-1">
				<div class="space-y-1">
					<p class="font-semibold text-amber-300 flex items-center gap-1.5">
						⚠️ <strong>Mismatch Status: {activeException.status}</strong>
					</p>
					<p class="text-muted-foreground">
						<strong>Reason:</strong> {activeException.reason}
					</p>
					<p class="text-xs font-medium text-amber-400/90 pt-0.5">
						<strong>Recommended Action:</strong> {activeException.action}
					</p>
				</div>
				<button
					onclick={() => handleResolveItem(activeException)}
					disabled={isResolving}
					class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs transition-all shadow-md shrink-0 self-start md:self-center disabled:opacity-50"
				>
					{isResolving ? 'Resolving...' : 'Resolve Exception'}
				</button>
			</div>
		</div>
	{:else}
		<div class="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 flex items-center justify-between flex-wrap gap-3">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
					<CheckCircle2 class="w-5 h-5" />
				</div>
				<div>
					<h3 class="text-sm font-bold text-emerald-400">No Reconciliation Exceptions Found</h3>
					<p class="text-xs text-muted-foreground">
						All ingested transactions are matched or pending batch execution. Run reconciliation to analyze new entries.
					</p>
				</div>
			</div>
			<button
				onclick={handleRunReconciliation}
				disabled={isRunning}
				class="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold transition-all shrink-0"
			>
				Run Reconciliation Batch
			</button>
		</div>
	{/if}

	<!-- Controls & Table Section -->
	<div class="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-5">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h2 class="text-lg font-bold tracking-tight">Financial Exceptions & Audit Ledger</h2>
				<p class="text-xs text-muted-foreground">Real-time status of cross-channel reconciled items and detected variances</p>
			</div>

			<div class="flex items-center gap-3 flex-wrap">
				<!-- Search -->
				<div class="relative">
					<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search merchant or TX code..."
						class="pl-9 pr-3 py-1.5 bg-secondary/40 border border-border/40 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary w-52"
					/>
				</div>

				<!-- Status Filter Tabs -->
				<div class="flex items-center bg-secondary/50 p-1 rounded-xl border border-border/40 text-xs flex-wrap gap-0.5">
					<button
						onclick={() => filterStatus = 'ALL'}
						class="px-2.5 py-1 rounded-lg transition-colors font-medium {filterStatus === 'ALL' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}"
					>
						All
					</button>
					<button
						onclick={() => filterStatus = 'MATCHED'}
						class="px-2.5 py-1 rounded-lg transition-colors font-medium {filterStatus === 'MATCHED' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground'}"
					>
						Matched
					</button>
					<button
						onclick={() => filterStatus = 'MISMATCH'}
						class="px-2.5 py-1 rounded-lg transition-colors font-medium {filterStatus === 'MISMATCH' ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:text-foreground'}"
					>
						Mismatch
					</button>
					<button
						onclick={() => filterStatus = 'SUSPICIOUS'}
						class="px-2.5 py-1 rounded-lg transition-colors font-medium {filterStatus === 'SUSPICIOUS' ? 'bg-destructive text-white' : 'text-muted-foreground hover:text-foreground'}"
					>
						Suspicious
					</button>
					<button
						onclick={() => filterStatus = 'RESOLVED'}
						class="px-2.5 py-1 rounded-lg transition-colors font-medium {filterStatus === 'RESOLVED' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}"
					>
						Resolved
					</button>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto rounded-xl border border-border/50">
			<table class="w-full text-left text-xs">
				<thead class="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border/50">
					<tr>
						<th class="px-4 py-3">Transaction</th>
						<th class="px-4 py-3">Source</th>
						<th class="px-4 py-3 text-right">Bank Amount</th>
						<th class="px-4 py-3 text-right">Receipt Amount</th>
						<th class="px-4 py-3 text-right">Difference</th>
						<th class="px-4 py-3 text-center">AI Decision Status</th>
						<th class="px-4 py-3 text-center">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/40 font-medium">
					{#if isLoading}
						<tr>
							<td colspan="7" class="py-12 text-center text-muted-foreground">
								<Loader2 class="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
								Loading Finance Controller Ledger...
							</td>
						</tr>
					{:else if filteredItems.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center space-y-3">
								<div class="text-muted-foreground text-xs">
									{#if items.length === 0}
										Your financial data will appear here after transactions are added to FinPilot.
									{:else}
										No reconciliation records found matching criteria.
									{/if}
								</div>
								{#if items.length === 0}
									<button
										onclick={handleRunReconciliation}
										disabled={isRunning}
										class="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
									>
										<Sparkles class="w-3.5 h-3.5" />
										Run AI Reconciliation
									</button>
								{/if}
							</td>
						</tr>
					{:else}
						{#each filteredItems as item (item.txCode)}
							<tr class="hover:bg-secondary/20 transition-colors">
								<td class="px-4 py-3.5">
									<div class="font-bold text-foreground">{item.merchant}</div>
									<div class="text-[10px] text-muted-foreground font-mono">{item.txCode}</div>
								</td>

								<td class="px-4 py-3.5 text-muted-foreground">
									<span class="inline-flex items-center gap-1 text-[11px]">
										<FileText class="w-3 h-3 text-primary/70" />
										{item.source || 'Ledger Record'}
									</span>
								</td>

								<td class="px-4 py-3.5 text-right font-bold font-mono">
									{fmt(item.bankAmount)}
								</td>

								<td class="px-4 py-3.5 text-right font-mono text-muted-foreground">
									{fmt(item.receiptAmount)}
								</td>

								<td class="px-4 py-3.5 text-right font-mono font-bold {item.difference > 0 ? 'text-amber-400' : 'text-muted-foreground'}">
									{item.difference > 0 ? fmt(item.difference) : '₹0'}
								</td>

								<td class="px-4 py-3.5 text-center">
									{#if item.status === 'MATCHED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
											✅ Matched
										</span>
									{:else if item.status === 'MISMATCH'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
											⚠️ Mismatch
										</span>
									{:else if item.status === 'RESOLVED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
											✓ Resolved
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
											🚨 Suspicious
										</span>
									{/if}
								</td>

								<td class="px-4 py-3.5 text-center">
									<div class="flex items-center justify-center gap-1.5">
										<button
											onclick={() => openAuditTrail(item)}
											class="px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-primary hover:text-white transition-colors text-[11px] font-semibold border border-border/50 inline-flex items-center gap-1"
											title="View Audit Trail"
										>
											<FileCode2 class="w-3.5 h-3.5" />
											Audit
										</button>
										{#if item.status === 'MISMATCH' || item.status === 'SUSPICIOUS'}
											<button
												onclick={() => handleResolveItem(item)}
												disabled={isResolving}
												class="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black transition-colors text-[11px] font-semibold border border-amber-500/40"
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
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="bg-card border border-border/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-200">
			<!-- Close Button -->
			<button
				onclick={closeModal}
				class="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
			>
				<X class="w-4 h-4" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
					<ShieldCheck class="w-5 h-5" />
				</div>
				<div>
					<h3 class="text-lg font-bold tracking-tight">AI Decision Audit Trail</h3>
					<p class="text-xs text-muted-foreground">Verifiable decision record for financial controller compliance</p>
				</div>
			</div>

			<!-- Audit Record Card -->
			<div class="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-3 font-mono text-xs">
				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Transaction Code:</span>
					<strong class="text-foreground">{activeAudit.txCode}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Merchant:</span>
					<strong class="text-foreground">{activeAudit.merchant}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Source:</span>
					<strong class="text-foreground">{activeAudit.source}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Receipt Reference:</span>
					<strong class="text-foreground">{activeAudit.receiptRef}</strong>
				</div>

				<div class="flex justify-between border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Reconciliation Status:</span>
					<span class="font-extrabold px-2 py-0.5 rounded text-[10px] {activeAudit.aiDecision === 'MATCHED' ? 'bg-emerald-500/20 text-emerald-400' : activeAudit.aiDecision === 'RESOLVED' ? 'bg-blue-500/20 text-blue-400' : activeAudit.aiDecision === 'MISMATCH' ? 'bg-amber-500/20 text-amber-400' : 'bg-destructive/20 text-destructive'}">
						{activeAudit.aiDecision}
					</span>
				</div>

				{#if activeAudit.confidence && activeAudit.confidence !== 'N/A'}
					<div class="flex justify-between border-b border-border/40 pb-2">
						<span class="text-muted-foreground">Matching Score:</span>
						<strong class="text-primary">{activeAudit.confidence}</strong>
					</div>
				{/if}

				<div class="space-y-1 border-b border-border/40 pb-2">
					<span class="text-muted-foreground">Reason & Explanation:</span>
					<p class="text-foreground font-sans text-xs pt-1 leading-relaxed bg-background/60 p-2.5 rounded-lg border border-border/30">
						{activeAudit.reason}
					</p>
				</div>

				<div class="flex justify-between pt-1">
					<span class="text-muted-foreground">Controller Action:</span>
					<strong class="text-emerald-400">{activeAudit.decisionStatus}</strong>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex justify-between items-center pt-2">
				{#if activeItemForAction && (activeItemForAction.status === 'MISMATCH' || activeItemForAction.status === 'SUSPICIOUS')}
					<button
						onclick={() => activeItemForAction && handleResolveItem(activeItemForAction)}
						disabled={isResolving}
						class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold transition-colors disabled:opacity-50"
					>
						{isResolving ? 'Resolving...' : 'Resolve Exception'}
					</button>
				{:else}
					<div></div>
				{/if}
				<button
					onclick={closeModal}
					class="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
				>
					Close Audit Trail
				</button>
			</div>
		</div>
	</div>
{/if}
