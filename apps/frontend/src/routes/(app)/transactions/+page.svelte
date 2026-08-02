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
		Sparkles
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
		// Detect URL query param to open modal automatically
		const params = new URLSearchParams(window.location.search);
		if (params.get('new') === 'true') {
			showAddModal = true;
			// Clear URL query parameters cleanly
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

			// Reset modal state
			newAmount = '';
			newMerchant = '';
			newDate = new Date().toISOString().split('T')[0];
			newTags = '';
			newRecurring = false;
			showAddModal = false;

			// Reload transactions list
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
	<header class="flex items-center justify-between flex-wrap gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Transactions</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and manage all your financial activity.</p>
		</div>
		<div class="flex items-center gap-2 flex-wrap">
			<button
				onclick={() => (showSmsImporter = !showSmsImporter)}
				class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold hover:bg-emerald-500/25 transition-all text-sm"
			>
				<Sparkles class="w-4 h-4" />
				{showSmsImporter ? 'Close SMS Importer' : 'Smart SMS Import'}
			</button>
			<button
				onclick={() => {
					showAddModal = true;
					submitError = '';
				}}
				class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 text-sm animate-pulse-subtle"
			>
				<Plus class="w-4 h-4" />
				Add Transaction
			</button>
			<button
				onclick={fetchTransactions}
				class="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-all"
			>
				<RefreshCw class="w-4 h-4" />
				Refresh
			</button>
		</div>
	</header>

	{#if showSmsImporter}
		<div transition:slide={{ duration: 200 }}>
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
				placeholder="Search transactions..."
				class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all"
			/>
		</div>
		<!-- Type filter tabs -->
		<div class="flex items-center gap-1 p-1 rounded-xl bg-card border border-border/60">
			{#each ['all', 'income', 'expense', 'transfer'] as type}
				<button
					onclick={() => (filterType = type as any)}
					class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
						{filterType === type
						? 'bg-primary text-white shadow-sm'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary'}"
				>
					{type}
				</button>
			{/each}
		</div>
	</div>

	<!-- Content -->
	{#if isLoading}
		<div class="flex items-center justify-center py-24">
			<Loader2 class="w-8 h-8 animate-spin text-primary" />
		</div>
	{:else if error}
		<div class="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
			<p class="text-red-400 font-medium">{error}</p>
			<button
				onclick={fetchTransactions}
				class="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-all"
			>
				Try Again
			</button>
		</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<div class="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4">
				<Wallet class="w-8 h-8 text-muted-foreground" />
			</div>
			<p class="text-lg font-semibold">No transactions found</p>
			<p class="text-muted-foreground text-sm mt-1">
				{searchQuery ? 'Try a different search term.' : 'Add your first transaction to get started.'}
			</p>
		</div>
	{:else}
		<!-- Transaction list -->
		<div class="rounded-2xl bg-card border border-border/60 overflow-hidden">
			<div class="divide-y divide-border/40">
				{#each filtered as tx (tx._id)}
					<div class="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors group">
						<!-- Icon -->
						<div class="shrink-0">
							{#if tx.type === 'income'}
								<div class="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
									<ArrowUpCircle class="w-5 h-5 text-emerald-400" />
								</div>
							{:else if tx.type === 'expense'}
								<div class="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
									<ArrowDownCircle class="w-5 h-5 text-red-400" />
								</div>
							{:else}
								<div class="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
									<ArrowLeftRight class="w-5 h-5 text-blue-400" />
								</div>
							{/if}
						</div>
						<!-- Details -->
						<div class="flex-1 min-w-0">
							<p class="font-medium text-sm truncate">{tx.merchant}</p>
							<div class="flex items-center gap-2 mt-0.5">
								<Calendar class="w-3 h-3 text-muted-foreground" />
								<span class="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
								{#if tx.categoryId}
									<span class="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tx.categoryId.name}</span>
								{/if}
								{#if tx.isRecurring}
									<span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Recurring</span>
								{/if}
							</div>
						</div>
						<!-- Amount -->
						<div class="shrink-0 text-right">
							<p class="font-semibold text-sm {tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'}">
								{formatAmount(tx.amount, tx.type)}
							</p>
							<span class="text-xs capitalize text-muted-foreground">{tx.status ?? 'cleared'}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<p class="text-xs text-muted-foreground text-center">Showing {filtered.length} of {transactions.length} transactions</p>
	{/if}
</div>

<!-- Add Transaction Modal -->
{#if showAddModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		onclick={() => (showAddModal = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-lg rounded-3xl bg-card border border-border/80 shadow-2xl p-6 relative overflow-hidden"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				onclick={() => (showAddModal = false)}
				class="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Close modal"
			>
				<X class="w-5 h-5" />
			</button>

			<h3 class="text-xl font-bold mb-4 flex items-center gap-2">
				<Wallet class="w-5 h-5 text-primary" />
				Add Transaction
			</h3>

			{#if submitError}
				<div class="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>{submitError}</span>
				</div>
			{/if}

			<form onsubmit={handleAddTransaction} class="space-y-4">
				<!-- Type tabs -->
				<div>
					<label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</label>
					<div class="flex p-1 rounded-xl bg-secondary/40 border border-border/60">
						{#each ['expense', 'income', 'transfer'] as type}
							<button
								type="button"
								onclick={() => (newType = type as any)}
								class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize
									{newType === type ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}"
							>
								{type}
							</button>
						{/each}
					</div>
				</div>

				<!-- Amount and Merchant -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="amount" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount ({uiState.currency})</label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{uiState.currencySymbol}</span>
							<input
								id="amount"
								type="number"
								step="any"
								required
								bind:value={newAmount}
								placeholder="0.00"
								class="w-full pl-8 pr-4 py-2.5 rounded-xl bg-secondary/20 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-all font-medium"
							/>
						</div>
					</div>
					<div>
						<label for="merchant" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Merchant / Desc</label>
						<input
							id="merchant"
							type="text"
							required
							bind:value={newMerchant}
							placeholder="e.g. Amazon, Uber, Salary"
							class="w-full px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-all"
						/>
					</div>
				</div>

				<!-- Date and Tags -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="date" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
						<input
							id="date"
							type="date"
							required
							bind:value={newDate}
							class="w-full px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-all"
						/>
					</div>
					<div>
						<label for="tags" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tags (Comma separated)</label>
						<input
							id="tags"
							type="text"
							bind:value={newTags}
							placeholder="e.g. food, travel, office"
							class="w-full px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-all"
						/>
					</div>
				</div>

				<!-- Recurring switch -->
				<div class="flex items-center justify-between py-2 border-y border-border/40">
					<div>
						<p class="text-sm font-semibold">Recurring Transaction</p>
						<p class="text-xs text-muted-foreground">Repeat this transaction monthly</p>
					</div>
					<input
						type="checkbox"
						bind:checked={newRecurring}
						class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
					/>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 mt-6">
					<button
						type="button"
						onclick={() => (showAddModal = false)}
						class="flex-1 py-3 rounded-xl border border-border/60 bg-secondary/40 font-semibold text-sm hover:bg-secondary transition-all"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if isSubmitting}
							<Loader2 class="w-4 h-4 animate-spin" />
							Adding...
						{:else}
							Add Transaction
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
