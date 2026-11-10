<script lang="ts">
	import { ocrApi, transactionApi, type OcrResult } from '$lib/api';
	import {
		Upload,
		FileImage,
		FileText,
		CheckCircle2,
		AlertCircle,
		Loader2,
		X,
		ReceiptText,
		ShoppingCart,
		Plus,
		RefreshCw,
		CalendarDays,
		Coins
	} from 'lucide-svelte';

	// ── State ─────────────────────────────────────────────────────────────────
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let isUploading = $state(false);
	let result = $state<OcrResult | null>(null);
	let error = $state('');
	let isDragging = $state(false);
	let savingTx = $state(false);
	let txSaved = $state(false);

	// ── File handling ─────────────────────────────────────────────────────────
	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) setFile(input.files[0]);
	}

	function setFile(f: File) {
		file = f;
		result = null;
		error = '';
		txSaved = false;
		preview = URL.createObjectURL(f);
	}

	function clearFile() {
		file = null;
		preview = null;
		result = null;
		error = '';
		txSaved = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const dropped = e.dataTransfer?.files[0];
		if (dropped && (dropped.type.startsWith('image/') || dropped.type === 'application/pdf')) {
			setFile(dropped);
		}
	}

	// ── Upload & OCR ──────────────────────────────────────────────────────────
	async function handleUpload() {
		if (!file) return;
		isUploading = true;
		error = '';
		result = null;
		try {
			result = await ocrApi.parseReceipt(file);
		} catch (e: any) {
			error = e.message ?? 'Failed to process receipt. Please try again.';
		} finally {
			isUploading = false;
		}
	}

	// ── Save as Transaction ───────────────────────────────────────────────────
	async function saveAsTransaction() {
		if (!result) return;
		savingTx = true;
		try {
			await transactionApi.create({
				type: 'expense',
				amount: result.total_amount,
				merchant: result.merchant ?? 'Unknown Merchant',
				date: result.date ?? new Date().toISOString(),
				currency: result.currency ?? 'INR',
				baseAmount: result.base_amount,
				taxAmount: result.tax_amount,
				taxBreakdown: result.tax_breakdown,
				additionalCharges: result.additional_charges,
				totalAmount: result.total_amount,
			});
			txSaved = true;
		} catch (e: any) {
			error = 'Failed to save transaction: ' + (e.message ?? '');
		} finally {
			savingTx = false;
		}
	}

	function fmt(n: number, currency = 'INR') {
		try {
			return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(n);
		} catch (e) {
			return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
		}
	}
</script>

<svelte:head>
	<title>Scan Receipt — FinPilot AI</title>
	<meta name="description" content="Upload receipts or invoices for automated OCR extraction and reconciliation." />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">Receipt Ingestion & OCR</h1>
			<p class="text-muted-foreground mt-1 text-xs">
				Extract vendor entity, itemized charges, and tax breakdowns into verified ledger entries.
			</p>
		</div>
		{#if file}
			<button
				onclick={clearFile}
				class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border/70"
			>
				<RefreshCw class="w-3.5 h-3.5" />
				Reset File
			</button>
		{/if}
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
		<!-- Left panel: Upload -->
		<div class="space-y-4">
			<!-- Drop zone -->
			{#if !preview}
				<div
					class="relative border border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
						{isDragging
						? 'border-primary bg-primary/5'
						: 'border-border/80 hover:border-border hover:bg-secondary/30'}"
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => (isDragging = false)}
					ondrop={onDrop}
					onclick={() => document.getElementById('file-input')?.click()}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
				>
					<div class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-primary">
						<Upload class="w-5 h-5" />
					</div>
					<div class="text-center">
						<p class="font-medium text-xs text-foreground">Drop receipt or invoice document here</p>
						<p class="text-[11px] text-muted-foreground mt-0.5">JPEG, PNG, WebP, or PDF format</p>
					</div>
					<input
						id="file-input"
						type="file"
						accept="image/jpeg,image/png,image/webp,application/pdf"
						class="sr-only"
						onchange={onFileChange}
					/>
				</div>
			{:else}
				<!-- File preview -->
				<div class="relative rounded-xl overflow-hidden border border-border/70 bg-card shadow-xs">
					{#if file?.type === 'application/pdf'}
						<iframe
							src="{preview}#toolbar=0"
							class="w-full h-72 border-0"
							title="PDF Document Preview"
						></iframe>
					{:else}
						<img src={preview} alt="Receipt Preview" class="w-full object-contain max-h-72 bg-secondary/10" />
					{/if}
					<button
						onclick={clearFile}
						class="absolute top-3 right-3 w-7 h-7 rounded-md bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Remove document"
					>
						<X class="w-3.5 h-3.5" />
					</button>
					<div class="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-card/90 border border-border/70 text-[11px] text-muted-foreground flex items-center gap-1.5">
						{#if file?.type === 'application/pdf'}
							<FileText class="w-3 h-3 text-destructive" />
						{:else}
							<FileImage class="w-3 h-3 text-primary" />
						{/if}
						<span class="truncate max-w-[200px]">{file?.name}</span>
					</div>
				</div>
			{/if}

			<!-- Upload action button -->
			{#if file && !result}
				<button
					onclick={handleUpload}
					disabled={isUploading}
					class="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isUploading}
						<Loader2 class="w-4 h-4 animate-spin" />
						Processing Optical Character Recognition…
					{:else}
						<ReceiptText class="w-4 h-4" />
						Extract Document Data
					{/if}
				</button>
			{/if}

			<!-- Error message -->
			{#if error}
				<div class="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 flex items-start gap-2.5 text-xs text-destructive">
					<AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
					<p>{error}</p>
				</div>
			{/if}

			<!-- Info specifications -->
			{#if !file}
				<div class="grid grid-cols-3 gap-2.5 mt-2 text-xs">
					{#each [
						{ label: 'Vision OCR', desc: 'Automated entity & tax extraction' },
						{ label: 'Multi-Format', desc: 'PDF invoices & camera receipts' },
						{ label: '3-Way Match', desc: 'Pushed directly to audit pipeline' }
					] as card}
						<div class="p-3 rounded-lg bg-card border border-border/70">
							<p class="font-medium text-foreground">{card.label}</p>
							<p class="text-[11px] text-muted-foreground mt-0.5 leading-tight">{card.desc}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right panel: Results -->
		<div class="space-y-4">
			{#if !result && !isUploading}
				<div class="h-full min-h-[280px] rounded-xl bg-card border border-border/70 border-dashed flex flex-col items-center justify-center gap-2 text-center p-6">
					<ReceiptText class="w-8 h-8 text-muted-foreground/40" />
					<p class="font-medium text-xs text-foreground">Extracted data will be structured here</p>
					<p class="text-[11px] text-muted-foreground">Select an invoice or receipt to begin processing</p>
				</div>
			{:else if isUploading}
				<div class="h-full min-h-[280px] rounded-xl bg-card border border-border/70 flex flex-col items-center justify-center gap-3">
					<Loader2 class="w-6 h-6 text-primary animate-spin" />
					<div class="text-center">
						<p class="font-medium text-xs text-foreground">Extracting document metadata…</p>
						<p class="text-[11px] text-muted-foreground mt-0.5">Parsing tax rates, totals, and line items</p>
					</div>
				</div>
			{:else if result}
				<!-- Result card -->
				<div class="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
					<div class="px-4 py-3 bg-secondary/30 border-b border-border/60 flex items-center gap-2.5">
						<CheckCircle2 class="w-4 h-4 text-emerald-400" />
						<div>
							<p class="font-medium text-xs text-foreground">Extraction Complete</p>
							<p class="text-[11px] text-muted-foreground">Review parsed fields before committing to ledger</p>
						</div>
					</div>

					<!-- Fields -->
					<div class="p-4 space-y-3 text-xs">
						<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
							<p class="text-[11px] text-muted-foreground mb-0.5">Vendor / Entity</p>
							<p class="font-medium text-foreground">{result.merchant ?? '—'}</p>
						</div>

						<div class="grid grid-cols-2 gap-2.5">
							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Posting Date</p>
								<p class="font-medium text-foreground">{result.date ?? '—'}</p>
							</div>

							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Invoice Reference</p>
								<p class="font-medium text-foreground truncate">{result.invoice_number ?? '—'}</p>
							</div>

							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Currency</p>
								<p class="font-medium text-foreground">{result.currency ?? 'INR'}</p>
							</div>

							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Base Taxable</p>
								<p class="font-mono font-medium text-foreground">{fmt(result.base_amount ?? 0, result.currency)}</p>
							</div>

							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Tax Assessed</p>
								<p class="font-mono font-medium {(result.tax_amount ?? 0) > 0 ? 'text-amber-400' : 'text-foreground'}">
									{fmt(result.tax_amount ?? 0, result.currency)}
								</p>
							</div>

							<div class="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
								<p class="text-[11px] text-muted-foreground mb-0.5">Ancillary Fees</p>
								<p class="font-mono font-medium text-foreground">
									{fmt(result.additional_charges?.reduce((s, c) => s + (c.amount || 0), 0) ?? 0, result.currency)}
								</p>
							</div>

							<!-- Total Amount -->
							<div class="p-2.5 rounded-lg bg-secondary/50 border border-border/70 col-span-2">
								<p class="text-[11px] text-muted-foreground mb-0.5">Total Payable</p>
								<p class="font-mono font-semibold text-base text-emerald-400">{fmt(result.total_amount, result.currency)}</p>
							</div>
						</div>

						<!-- Line items -->
						{#if result.line_items?.length > 0}
							<div>
								<p class="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
									<ShoppingCart class="w-3.5 h-3.5" />
									Itemized Charges
								</p>
								<div class="space-y-1 max-h-32 overflow-y-auto">
									{#each result.line_items as item}
										<div class="flex items-center justify-between px-2.5 py-1.5 rounded bg-secondary/20 text-xs">
											<span class="text-muted-foreground truncate mr-2">{item.description}</span>
											<span class="font-mono font-medium text-foreground shrink-0">{fmt(item.amount, result.currency)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Save action -->
						{#if txSaved}
							<div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
								<CheckCircle2 class="w-4 h-4 shrink-0" />
								<span>Transaction committed to general ledger.</span>
							</div>
						{:else}
							<button
								onclick={saveAsTransaction}
								disabled={savingTx}
								class="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
							>
								{#if savingTx}
									<Loader2 class="w-3.5 h-3.5 animate-spin" />
									Recording Entry…
								{:else}
									<Plus class="w-3.5 h-3.5" />
									Post to General Ledger
								{/if}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
