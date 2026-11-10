<script lang="ts">
	import { onMount } from 'svelte';
	import { transactionApi, type Transaction } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import SmartSmsImporter from '$lib/components/shared/SmartSmsImporter.svelte';
	import { slide } from 'svelte/transition';
	import {
		ArrowUpCircle,
		ArrowDownCircle,
		ArrowLeftRight,
		Plus,
		Search,
		RefreshCw,
		Calendar,
		Loader2,
		Wallet,
		X,
		AlertCircle,
		FileSpreadsheet
	} from 'lucide-svelte';

	// ── List State ─────────────────────────────────────────────────────────────
	let transactions = $state<Transaction[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let filterType = $state<'all' | 'income' | 'expense' | 'transfer'>('all');
	let showSmsImporter = $state(false);

	// ── Add Modal State ────────────────────────────────────────────────────────
	let showAddModal = $state(false);
	let newType = $state<'income' | 'expense' | 'transfer'>('expense');
	let newAmount = $state<number | ''>('');
	let newMerchant = $state('');
	let newDate = $state(new Date().toISOString().split('T')[0]);
	let newTags = $state('');
	let newRecurring = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state('');

	async function fetchTransactions() {
		isLoading = true;
		error = null;
		try {
			const res = await transactionApi.list(1, 100);
			transactions = res.transactions;
		} catch (e: any) {
			error = e.message ?? 'Failed to load transactions';
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		await fetchTransactions();
		const params = new URLSearchParams(window.location.search);
		if (params.get('new') === 'true') {
			showAddModal = true;
			window.history.replaceState({}, '', window.location.pathname);
		}
	});

	const filtered = $derived(
		transactions.filter((t) => {
			const matchesType = filterType === 'all' || t.type === filterType;
			const matchesSearch =
				!searchQuery ||
				t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(t.tags ?? []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
			return matchesType && matchesSearch;
		})
	);

	function formatAmount(amount: number, type: string) {
		const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '±';
		try {
			const formatted = new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency: uiState.currency,
				maximumFractionDigits: 2,
			}).format(amount);
			return `${prefix}${formatted}`;
		} catch {
			return `${prefix}${uiState.currencySymbol}${amount.toLocaleString('en-IN')}`;
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleAddTransaction(e: Event) {
		e.preventDefault();
		if (!newAmount || Number(newAmount) <= 0) {
			submitError = 'Please enter a valid amount greater than 0';
			return;
		}
		if (!newMerchant.trim()) {
			submitError = 'Please enter a merchant or description';
			return;
		}

		isSubmitting = true;
		submitError = '';

		try {
			await transactionApi.create({
				type: newType,
				amount: Number(newAmount),
				merchant: newMerchant.trim(),
				date: new Date(newDate).toISOString(),
				tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
				isRecurring: newRecurring,
				currency: uiState.currency
			});

			newAmount = '';
			newMerchant = '';
			newDate = new Date().toISOString().split('T')[0];
			newTags = '';
			newRecurring = false;
			showAddModal = false;

			await fetchTransactions();
		} catch (err: any) {
			submitError = err.message ?? 'Failed to add transaction';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Transactions — FinPilot AI</title>
	<meta name="description" content="Manage and review all your financial transactions." />
</svelte:head>

<div class="space-y-6 max-w-7xl relative">
	<!-- Header -->
	<header class="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border/60">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">Transactions</h1>
			<p class="text-muted-foreground mt-1 text-xs">Ledger records, automated parsing, and transaction tracking.</p>
		</div>
		<div class="flex items-center gap-2 flex-wrap">
			<button
				onclick={() => (showSmsImporter = !showSmsImporter)}
				class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary text-foreground border border-border/80 font-medium hover:bg-secondary/80 transition-colors text-xs"
			>
				<FileSpreadsheet class="w-3.5 h-3.5 text-primary" />
				{showSmsImporter ? 'Close Parser' : 'Import Statements'}
			</button>
			<button
				onclick={() => {
					showAddModal = true;
					submitError = '';
				}}
				class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-xs shadow-xs"
			>
				<Plus class="w-3.5 h-3.5" />
				New Transaction
			</button>
			<button
				onclick={fetchTransactions}
				class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/70 bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<RefreshCw class="w-3.5 h-3.5" />
				Refresh
			</button>
		</div>
	</header>

	{#if showSmsImporter}
		<div transition:slide={{ duration: 150 }}>
			<SmartSmsImporter onComplete={fetchTransactions} />
		</div>
	{/if}

	<!-- Filters -->
	<div class="flex flex-wrap gap-3">
		<!-- Search -->
		<div class="relative flex-1 min-w-48">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by merchant or tags..."
				class="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-colors"
			/>
		</div>
		<!-- Type filter tabs -->
		<div class="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/70">
			{#each ['all', 'income', 'expense', 'transfer'] as type}
				<button
					onclick={() => (filterType = type as any)}
					class="px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize
						{filterType === type
						? 'bg-primary text-primary-foreground font-semibold'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'}"
				>
					{type}
				</button>
			{/each}
		</div>
	</div>

	<!-- Content -->
	{#if isLoading}
		<div class="flex items-center justify-center py-20">
			<div class="flex flex-col items-center gap-2 text-muted-foreground">
				<Loader2 class="w-6 h-6 animate-spin text-primary" />
				<span class="text-xs">Loading ledger entries…</span>
			</div>
		</div>
	{:else if error}
		<div class="rounded-xl bg-destructive/10 border border-destructive/25 p-5 text-center">
			<p class="text-destructive text-xs font-medium">{error}</p>
			<button
				onclick={fetchTransactions}
				class="mt-3 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/70 rounded-xl p-8">
			<div class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3 text-muted-foreground">
				<Wallet class="w-5 h-5" />
			</div>
			<p class="text-sm font-semibold text-foreground">No transactions found</p>
			<p class="text-muted-foreground text-xs mt-1">
				{searchQuery ? 'Adjust your search query or filter settings.' : 'Record your first transaction above.'}
			</p>
		</div>
	{:else}
		<!-- Transaction list -->
		<div class="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
			<div class="divide-y divide-border/50">
				{#each filtered as tx (tx._id)}
					<div class="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/40 transition-colors">
						<!-- Icon -->
						<div class="shrink-0">
							{#if tx.type === 'income'}
								<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
									<ArrowUpCircle class="w-4 h-4" />
								</div>
							{:else if tx.type === 'expense'}
								<div class="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
									<ArrowDownCircle class="w-4 h-4" />
								</div>
							{:else}
								<div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
									<ArrowLeftRight class="w-4 h-4" />
								</div>
							{/if}
						</div>
						<!-- Details -->
						<div class="flex-1 min-w-0">
							<p class="font-medium text-xs text-foreground truncate">{tx.merchant}</p>
							<div class="flex items-center gap-2 mt-0.5">
								<Calendar class="w-3 h-3 text-muted-foreground" />
								<span class="text-[11px] text-muted-foreground">{formatDate(tx.date)}</span>
								{#if tx.categoryId}
									<span class="text-[11px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">{tx.categoryId.name}</span>
								{/if}
								{#if tx.isRecurring}
									<span class="text-[11px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium">Recurring</span>
								{/if}
							</div>
						</div>
						<!-- Amount -->
						<div class="shrink-0 text-right">
							<p class="font-semibold font-mono text-xs {tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-foreground' : 'text-primary'}">
								{formatAmount(tx.amount, tx.type)}
							</p>
							<span class="text-[11px] capitalize text-muted-foreground">{tx.status ?? 'cleared'}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<p class="text-[11px] text-muted-foreground text-center">Showing {filtered.length} of {transactions.length} records</p>
	{/if}
</div>

<!-- Add Transaction Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-modal-title"
		tabindex="-1"
		onclick={() => (showAddModal = false)}
		onkeydown={(e) => { if (e.key === 'Escape') showAddModal = false; }}
	>
		<!-- Modal Content Box -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-lg rounded-xl bg-card border border-border/80 shadow-xl p-6 relative overflow-hidden"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				onclick={() => (showAddModal = false)}
				class="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
				aria-label="Close modal"
			>
				<X class="w-4 h-4" />
			</button>

			<h3 id="add-modal-title" class="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
				<Wallet class="w-4.5 h-4.5 text-primary" />
				Record New Transaction
			</h3>

			{#if submitError}
				<div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>{submitError}</span>
				</div>
			{/if}

			<form onsubmit={handleAddTransaction} class="space-y-4">
				<!-- Type tabs -->
				<div>
					<span id="transaction-type-label" class="block text-xs font-medium text-muted-foreground mb-1.5">Transaction Type</span>
					<div
						role="group"
						aria-labelledby="transaction-type-label"
						class="flex p-1 rounded-lg bg-secondary/40 border border-border/60"
					>
						{#each ['expense', 'income', 'transfer'] as type}
							<button
								type="button"
								onclick={() => (newType = type as any)}
								class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize
									{newType === type ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
							>
								{type}
							</button>
						{/each}
					</div>
				</div>

				<!-- Amount and Merchant -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="amount" class="block text-xs font-medium text-muted-foreground mb-1">Amount ({uiState.currency})</label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">{uiState.currencySymbol}</span>
							<input
								id="amount"
								type="number"
								step="any"
								required
								bind:value={newAmount}
								placeholder="0.00"
								class="w-full pl-7 pr-3 py-2 rounded-lg bg-secondary/30 border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring font-mono transition-colors"
							/>
						</div>
					</div>
					<div>
						<label for="merchant" class="block text-xs font-medium text-muted-foreground mb-1">Entity / Merchant</label>
						<input
							id="merchant"
							type="text"
							required
							bind:value={newMerchant}
							placeholder="e.g. AWS, Payroll, Stripe"
							class="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
						/>
					</div>
				</div>

				<!-- Date and Tags -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="date" class="block text-xs font-medium text-muted-foreground mb-1">Posting Date</label>
						<input
							id="date"
							type="date"
							required
							bind:value={newDate}
							class="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
						/>
					</div>
					<div>
						<label for="tags" class="block text-xs font-medium text-muted-foreground mb-1">Tags (Comma-separated)</label>
						<input
							id="tags"
							type="text"
							bind:value={newTags}
							placeholder="e.g. cloud, software, ops"
							class="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
						/>
					</div>
				</div>

				<!-- Recurring toggle -->
				<div class="flex items-center justify-between py-2 border-y border-border/40">
					<div>
						<p class="text-xs font-medium text-foreground">Recurring Entry</p>
						<p class="text-[11px] text-muted-foreground">Mark as recurring monthly schedule</p>
					</div>
					<input
						type="checkbox"
						bind:checked={newRecurring}
						class="w-4 h-4 rounded text-primary focus:ring-ring border-border"
					/>
				</div>

				<!-- Actions -->
				<div class="flex gap-2.5 mt-5">
					<button
						type="button"
						onclick={() => (showAddModal = false)}
						class="flex-1 py-2 rounded-lg border border-border/70 bg-secondary/40 font-medium text-xs hover:bg-secondary transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
					>
						{#if isSubmitting}
							<Loader2 class="w-3.5 h-3.5 animate-spin" />
							Recording...
						{:else}
							Record Entry
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
