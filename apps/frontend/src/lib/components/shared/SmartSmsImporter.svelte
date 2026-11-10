<script lang="ts">
	import { parseSmsText, type ParsedSmsTransaction } from '$lib/utils/smsParser';
	import { transactionApi } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import {
		CheckCircle2,
		AlertCircle,
		Loader2,
		ArrowUpCircle,
		ArrowDownCircle,
		ArrowLeftRight,
		Trash2,
		UploadCloud,
		FileText,
		FileSpreadsheet
	} from 'lucide-svelte';

	let { onComplete }: { onComplete?: () => void } = $props();

	let rawInput = $state('');
	let parsedItems = $state<ParsedSmsTransaction[]>([]);
	let isImporting = $state(false);
	let error = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	const SAMPLE_SMS = `Sent Rs. 450.00 via UPI to Swiggy on 31-Jul-26 ref no 421093. Avail Bal Rs 12,450.00 - HDFC Bank

A/c credited with Rs 50000.00 on 01-Jul-26 from TECH CORP SALARY. Info: SALARY JULY - SBI

Debited Rs 1200.00 from A/C 4821 on 28-Jul-26 towards Amazon India.

Paid Rs. 250 to Zomato using UPI on 29-Jul-26.`;

	function handleParse() {
		error = null;
		successMsg = null;
		parsedItems = parseSmsText(rawInput, uiState.currency);
		if (parsedItems.length === 0 && rawInput.trim().length > 0) {
			error = 'No recognizable transaction structures matched in input text. Verify amount, merchant, and date formatting.';
		}
	}

	function loadSample() {
		rawInput = SAMPLE_SMS;
		handleParse();
	}

	function removeItem(id: string) {
		parsedItems = parsedItems.filter((i) => i.id !== id);
	}

	async function handleBulkImport() {
		if (parsedItems.length === 0) return;
		isImporting = true;
		error = null;
		successMsg = null;

		try {
			const payload = parsedItems.map((item) => ({
				type: item.type,
				amount: item.amount,
				merchant: item.merchant,
				currency: item.currency || uiState.currency,
				date: item.date,
				tags: ['sms-import', 'auto-parsed'],
				isRecurring: false
			}));

			const res = await transactionApi.bulkCreate(payload);
			successMsg = `Successfully committed ${res.count} transactions to general ledger.`;
			parsedItems = [];
			rawInput = '';
			if (onComplete) onComplete();
		} catch (err: any) {
			error = err.message ?? 'Failed to import transactions';
		} finally {
			isImporting = false;
		}
	}

	function formatAmount(amount: number) {
		return `${uiState.currencySymbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
	}
</script>

<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
	<!-- Header -->
	<div class="flex items-start justify-between flex-wrap gap-3 pb-2 border-b border-border/50">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
				<FileSpreadsheet class="w-4 h-4" />
			</div>
			<div>
				<h2 class="text-sm font-semibold text-foreground tracking-tight">Statement & SMS Parser</h2>
				<p class="text-xs text-muted-foreground mt-0.5">
					Parse text notifications and bank statements directly into ledger items.
				</p>
			</div>
		</div>

		<button
			type="button"
			onclick={loadSample}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/60 text-xs font-medium text-foreground transition-colors"
		>
			<FileText class="w-3.5 h-3.5 text-muted-foreground" />
			Load Sample Statement
		</button>
	</div>

	<!-- Alert Messages -->
	{#if error}
		<div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
			<AlertCircle class="w-4 h-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	{#if successMsg}
		<div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
			<CheckCircle2 class="w-4 h-4 shrink-0" />
			<span>{successMsg}</span>
		</div>
	{/if}

	<!-- Textarea input -->
	<div class="space-y-1.5">
		<label for="sms-input" class="block text-xs font-medium text-muted-foreground">
			Statement Text or Notification Stream
		</label>
		<textarea
			id="sms-input"
			bind:value={rawInput}
			oninput={handleParse}
			rows="4"
			placeholder="Paste bank notification texts here..."
			class="w-full p-3 rounded-lg bg-secondary/30 border border-border/70 text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-colors font-mono leading-relaxed text-foreground"
		></textarea>
	</div>

	<!-- Parsed Preview List -->
	{#if parsedItems.length > 0}
		<div class="space-y-3 pt-1">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-medium text-muted-foreground flex items-center gap-2">
					<span>Parsed Transactions</span>
					<span class="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[11px] font-semibold">{parsedItems.length}</span>
				</h3>
				<span class="text-[11px] text-muted-foreground">Confirm merchant and classification before committing</span>
			</div>

			<div class="rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden max-h-56 overflow-y-auto">
				{#each parsedItems as item (item.id)}
					<div class="p-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
						<div class="shrink-0">
							{#if item.type === 'income'}
								<ArrowUpCircle class="w-4 h-4 text-emerald-400" />
							{:else if item.type === 'expense'}
								<ArrowDownCircle class="w-4 h-4 text-destructive" />
							{:else}
								<ArrowLeftRight class="w-4 h-4 text-primary" />
							{/if}
						</div>

						<div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
							<input
								type="text"
								bind:value={item.merchant}
								class="bg-secondary/40 border border-border/60 rounded px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							/>

							<div class="flex items-center gap-2">
								<select
									bind:value={item.type}
									class="bg-secondary/40 border border-border/60 rounded px-2 py-1 text-xs font-medium focus:outline-none capitalize text-foreground"
								>
									<option value="expense">Expense</option>
									<option value="income">Income</option>
									<option value="transfer">Transfer</option>
								</select>
								<span class="text-[11px] text-muted-foreground hidden sm:inline">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
							</div>

							<div class="text-right font-mono font-medium text-xs {item.type === 'income' ? 'text-emerald-400' : 'text-foreground'}">
								{formatAmount(item.amount)}
							</div>
						</div>

						<button
							type="button"
							onclick={() => removeItem(item.id)}
							class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
							title="Remove from batch"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			</div>

			<!-- Submit Button -->
			<div class="pt-1 flex justify-end">
				<button
					type="button"
					onclick={handleBulkImport}
					disabled={isImporting}
					class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
				>
					{#if isImporting}
						<Loader2 class="w-3.5 h-3.5 animate-spin" />
						Importing…
					{:else}
						<UploadCloud class="w-3.5 h-3.5" />
						Commit {parsedItems.length} Record{parsedItems.length > 1 ? 's' : ''} to Ledger
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
