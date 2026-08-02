<script lang="ts">
	import { ocrApi, transactionApi, type OcrResult } from '$lib/api';
	import {
		Upload,
		FileImage,
		CheckCircle2,
		AlertCircle,
		Loader2,
		X,
		ReceiptText,
		ShoppingCart,
		Plus,
		RefreshCw,
		CalendarDays,
		Coins,
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
		if (dropped && dropped.type.startsWith('image/')) setFile(dropped);
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
			});
			txSaved = true;
		} catch (e: any) {
			error = 'Failed to save transaction: ' + (e.message ?? '');
		} finally {
			savingTx = false;
		}
	}

	function fmt(n: number) {
		return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
	}
</script>

<svelte:head>
	<title>Scan Receipt — FinPilot AI</title>
	<meta name="description" content="Upload a receipt image and extract structured data instantly using AI-powered OCR." />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Scan Receipt</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Upload a receipt image and AI will extract merchant, amount and line items automatically.
			</p>
		</div>
		{#if file}
			<button
				onclick={clearFile}
				class="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground transition-all"
			>
				<RefreshCw class="w-4 h-4" /> Scan Another
			</button>
		{/if}
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- ── Left panel: Upload ── -->
		<div class="space-y-4">
			<!-- Drop zone -->
			{#if !preview}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200
						{isDragging
						? 'border-primary bg-primary/8 scale-[1.01]'
						: 'border-border hover:border-primary/50 hover:bg-primary/3'}"
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => (isDragging = false)}
					ondrop={onDrop}
					onclick={() => document.getElementById('file-input')?.click()}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
				>
					<div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
						<Upload class="w-7 h-7 text-primary" />
					</div>
					<div class="text-center">
						<p class="font-semibold text-foreground">Drop your receipt here</p>
						<p class="text-sm text-muted-foreground mt-1">or click to browse — JPEG, PNG, WebP</p>
					</div>
					<input
						id="file-input"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="sr-only"
						onchange={onFileChange}
					/>
				</div>
			{:else}
				<!-- Image preview -->
				<div class="relative rounded-2xl overflow-hidden border border-border/60 bg-card shadow-xl">
					<img src={preview} alt="Receipt preview" class="w-full object-contain max-h-80" />
					<button
						onclick={clearFile}
						class="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Remove image"
					>
						<X class="w-4 h-4" />
					</button>
					<div class="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
						<FileImage class="w-3.5 h-3.5" />
						{file?.name}
					</div>
				</div>
			{/if}

			<!-- Upload button -->
			{#if file && !result}
				<button
					onclick={handleUpload}
					disabled={isUploading}
					class="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{#if isUploading}
						<Loader2 class="w-5 h-5 animate-spin" />
						Extracting text…
					{:else}
						<ReceiptText class="w-5 h-5" />
						Extract Data from Receipt
					{/if}
				</button>
			{/if}

			<!-- Error -->
			{#if error}
				<div class="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
					<AlertCircle class="w-5 h-5 text-destructive shrink-0 mt-0.5" />
					<p class="text-sm text-destructive">{error}</p>
				</div>
			{/if}

			<!-- Info cards -->
			{#if !file}
				<div class="grid grid-cols-3 gap-3 mt-2">
					{#each [
						{ label: 'AI-Powered', desc: 'Gemini Vision OCR' },
						{ label: 'Instant', desc: 'Results in seconds' },
						{ label: 'Accurate', desc: 'Merchant + amounts' }
					] as card}
						<div class="p-3 rounded-xl bg-card border border-border/60 text-center">
							<p class="text-xs font-semibold text-foreground">{card.label}</p>
							<p class="text-[11px] text-muted-foreground mt-0.5">{card.desc}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── Right panel: Results ── -->
		<div class="space-y-4">
			{#if !result && !isUploading}
				<!-- Empty state -->
				<div class="h-full min-h-[300px] rounded-2xl bg-card border border-border/60 border-dashed flex flex-col items-center justify-center gap-3 text-center p-8">
					<ReceiptText class="w-12 h-12 text-muted-foreground opacity-30" />
					<p class="font-medium text-muted-foreground">Extracted data will appear here</p>
					<p class="text-sm text-muted-foreground/60">Upload a receipt image and click Extract</p>
				</div>
			{:else if isUploading}
				<div class="h-full min-h-[300px] rounded-2xl bg-card border border-border/60 flex flex-col items-center justify-center gap-4">
					<div class="relative">
						<div class="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
							<Loader2 class="w-8 h-8 text-primary animate-spin" />
						</div>
						<div class="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping"></div>
					</div>
					<div class="text-center">
						<p class="font-semibold">Analyzing receipt…</p>
						<p class="text-sm text-muted-foreground mt-1">Gemini Vision is reading your receipt</p>
					</div>
				</div>
			{:else if result}
				<!-- Result card -->
				<div class="rounded-2xl bg-card border border-border/60 overflow-hidden shadow-xl">
					<!-- Header -->
					<div class="px-5 py-4 bg-emerald-500/5 border-b border-border/60 flex items-center gap-3">
						<div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
							<CheckCircle2 class="w-5 h-5 text-emerald-400" />
						</div>
						<div>
							<p class="font-semibold text-sm">Extraction Complete</p>
							<p class="text-xs text-muted-foreground">Review and save the data below</p>
						</div>
					</div>

					<!-- Summary fields -->
					<div class="p-5 space-y-4">
						<div class="grid grid-cols-2 gap-3">
							<div class="p-3 rounded-xl bg-secondary/40 border border-border/40">
								<p class="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Merchant</p>
								<p class="font-semibold text-sm">{result.merchant ?? '—'}</p>
							</div>
							<div class="p-3 rounded-xl bg-secondary/40 border border-border/40">
								<p class="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1 flex items-center gap-1">
									<CalendarDays class="w-3 h-3" /> Date
								</p>
								<p class="font-semibold text-sm">{result.date ?? '—'}</p>
							</div>
							<div class="p-3 rounded-xl bg-secondary/40 border border-border/40">
								<p class="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1 flex items-center gap-1">
									<Coins class="w-3 h-3" /> Total
								</p>
								<p class="font-bold text-lg text-emerald-400">{fmt(result.total_amount)}</p>
							</div>
							<div class="p-3 rounded-xl bg-secondary/40 border border-border/40">
								<p class="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Tax</p>
								<p class="font-semibold text-sm">{fmt(result.tax)}</p>
							</div>
						</div>

						<!-- Line items -->
						{#if result.line_items?.length > 0}
							<div>
								<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
									<ShoppingCart class="w-3.5 h-3.5" /> Line Items
								</p>
								<div class="space-y-1.5 max-h-36 overflow-y-auto">
									{#each result.line_items as item}
										<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
											<span class="text-muted-foreground truncate mr-3">{item.description}</span>
											<span class="font-medium shrink-0">{fmt(item.amount)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Raw text collapsible -->
						{#if result.raw_text}
							<details class="group">
								<summary class="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
									Show raw extracted text
								</summary>
								<div class="mt-2 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground font-mono leading-relaxed max-h-28 overflow-y-auto">
									{result.raw_text}
								</div>
							</details>
						{/if}

						<!-- Save button -->
						{#if txSaved}
							<div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
								<CheckCircle2 class="w-4 h-4" />
								Transaction saved successfully!
							</div>
						{:else}
							<button
								onclick={saveAsTransaction}
								disabled={savingTx}
								class="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
							>
								{#if savingTx}
									<Loader2 class="w-4 h-4 animate-spin" />
									Saving…
								{:else}
									<Plus class="w-4 h-4" />
									Save as Transaction
								{/if}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
