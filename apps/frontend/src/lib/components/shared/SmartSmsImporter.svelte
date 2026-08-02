<script lang="ts">
	import { parseSmsText, type ParsedSmsTransaction } from '$lib/utils/smsParser';
	import { transactionApi } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import {
		Sparkles,
		CheckCircle2,
		AlertCircle,
		Loader2,
		ArrowUpCircle,
		ArrowDownCircle,
		ArrowLeftRight,
		Trash2,
		UploadCloud,
		FileText
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
			error = 'Could not find clear transaction details in the pasted text. Try adjusting format or paste bank SMS notifications.';
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
			successMsg = `Successfully imported ${res.count} transactions!`;
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

<div class="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between flex-wrap gap-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
					<Sparkles class="w-4 h-4" />
				</div>
				<h2 class="text-xl font-bold tracking-tight">Smart SMS & Text Importer</h2>
				<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase border border-emerald-500/30">AI Powered</span>
			</div>
			<p class="text-xs text-muted-foreground mt-1">
				Paste bank SMS alerts (HDFC, SBI, ICICI, PhonePe, Google Pay, UPI) to auto-extract transactions without manual entry!
			</p>
		</div>

		<button
			type="button"
			onclick={loadSample}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
		>
			<FileText class="w-3.5 h-3.5" />
			Load Sample Bank SMS
		</button>
	</div>

	<!-- Alert Messages -->
	{#if error}
		<div class="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
			<AlertCircle class="w-4 h-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	{#if successMsg}
		<div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
			<CheckCircle2 class="w-4 h-4 shrink-0" />
			<span>{successMsg}</span>
		</div>
	{/if}

	<!-- Textarea input -->
	<div class="space-y-2">
		<label for="sms-input" class="block text-xs font-semibold uppercase text-muted-foreground tracking-wider">
			Paste Bank SMS Messages or Notification Text
		</label>
		<textarea
			id="sms-input"
			bind:value={rawInput}
			oninput={handleParse}
			rows="4"
			placeholder="Paste bank SMS here... E.g. 'Sent Rs 450.00 via UPI to Swiggy on 31-Jul-26...' or 'A/c credited with Rs 50000.00...'"
			class="w-full p-4 rounded-xl bg-secondary/20 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary placeholder:text-muted-foreground/60 transition-all font-mono text-xs leading-relaxed"
		></textarea>
	</div>

	<!-- Parsed Preview List -->
	{#if parsedItems.length > 0}
		<div class="space-y-3 pt-2">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
					Detected Transactions
					<span class="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">{parsedItems.length}</span>
				</h3>
				<span class="text-[11px] text-muted-foreground">Review before importing</span>
			</div>

			<div class="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden max-h-64 overflow-y-auto">
				{#each parsedItems as item (item.id)}
					<div class="p-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
						<div class="shrink-0">
							{#if item.type === 'income'}
								<ArrowUpCircle class="w-5 h-5 text-emerald-400" />
							{:else if item.type === 'expense'}
								<ArrowDownCircle class="w-5 h-5 text-red-400" />
							{:else}
								<ArrowLeftRight class="w-5 h-5 text-blue-400" />
							{/if}
						</div>

						<div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
							<input
								type="text"
								bind:value={item.merchant}
								class="bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
							/>

							<div class="flex items-center gap-2">
								<select
									bind:value={item.type}
									class="bg-secondary/40 border border-border/40 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none capitalize"
								>
									<option value="expense">Expense</option>
									<option value="income">Income</option>
									<option value="transfer">Transfer</option>
								</select>
								<span class="text-[10px] text-muted-foreground hidden sm:inline">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
							</div>

							<div class="text-right font-bold text-xs {item.type === 'income' ? 'text-emerald-400' : 'text-foreground'}">
								{formatAmount(item.amount)}
							</div>
						</div>

						<button
							type="button"
							onclick={() => removeItem(item.id)}
							class="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
							title="Remove from import list"
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				{/each}
			</div>

			<!-- Submit Button -->
			<div class="pt-2 flex justify-end">
				<button
					type="button"
					onclick={handleBulkImport}
					disabled={isImporting}
					class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
				>
					{#if isImporting}
						<Loader2 class="w-4 h-4 animate-spin" />
						Importing Transactions...
					{:else}
						<UploadCloud class="w-4 h-4" />
						Import {parsedItems.length} Transaction{parsedItems.length > 1 ? 's' : ''} Direct to DB
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
