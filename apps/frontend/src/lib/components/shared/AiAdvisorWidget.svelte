<script lang="ts">
	import { aiApi } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import { formatAiMessage } from '$lib/utils/markdown';
	import {
		Bot,
		Send,
		Loader2,
		User
	} from 'lucide-svelte';

	let { contextSummary }: { contextSummary?: string } = $props();

	let messages = $state<Array<{ role: 'user' | 'assistant'; text: string }>>([
		{
			role: 'assistant',
			text: `FinPilot Financial Advisor active. Ask about ledger trends, budget allocations, or select a query below.`
		}
	]);

	let inputQuery = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const QUICK_PROMPTS = [
		{ label: 'Analyze expenditure patterns', prompt: 'Analyze my spending habits and identify opportunities for cost reduction.' },
		{ label: 'Capital accumulation guidance', prompt: `How can I optimize savings velocity this month in ${uiState.currency}?` },
		{ label: 'Detect expenditure anomalies', prompt: 'Audit my transactions for unusual variances or abnormal expenses.' },
		{ label: '3 Cash allocation rules', prompt: 'Provide 3 concise rules for institutional-style personal cash management.' }
	];

	async function handleSend(textToSend?: string) {
		const query = textToSend || inputQuery;
		if (!query || !query.trim() || isLoading) return;

		const userMsg = query.trim();
		messages = [...messages, { role: 'user', text: userMsg }];
		if (!textToSend) inputQuery = '';
		isLoading = true;
		error = null;

		try {
			const res = await aiApi.chat(
				userMsg,
				contextSummary || `User currency: ${uiState.currency}`
			);

			messages = [...messages, { role: 'assistant', text: res.reply }];
		} catch (err: any) {
			error = err.message ?? 'Failed to get AI response';
			messages = [
				...messages,
				{
					role: 'assistant',
					text: 'Unable to connect to intelligence service. Please verify backend service availability.'
				}
			];
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="bg-card border border-border/70 rounded-xl p-5 shadow-xs flex flex-col h-full min-h-[380px]">
	<!-- Header -->
	<div class="flex items-center justify-between mb-3 pb-2.5 border-b border-border/50">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
				<Bot class="w-4 h-4" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h3 class="font-semibold text-xs tracking-tight text-foreground">Financial Advisory Terminal</h3>
					<span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Operational</span>
				</div>
				<p class="text-[11px] text-muted-foreground">Automated accounting analysis & spending guidance</p>
			</div>
		</div>
	</div>

	<!-- Quick Prompt Buttons -->
	<div class="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-1 no-scrollbar">
		{#each QUICK_PROMPTS as pill}
			<button
				type="button"
				onclick={() => handleSend(pill.prompt)}
				disabled={isLoading}
				class="shrink-0 px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
			>
				{pill.label}
			</button>
		{/each}
	</div>

	<!-- Chat Conversation Stream -->
	<div class="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2 max-h-[260px]">
		{#each messages as msg}
			<div class="flex gap-2.5 {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if msg.role === 'assistant'}
					<div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-1">
						<Bot class="w-3.5 h-3.5" />
					</div>
				{/if}

				<div
					class="max-w-[85%] p-3 rounded-lg text-xs leading-relaxed
					{msg.role === 'user'
						? 'bg-primary text-primary-foreground font-medium whitespace-pre-wrap'
						: 'bg-secondary/40 border border-border/50 text-foreground'}"
				>
					{#if msg.role === 'assistant'}
						{@html formatAiMessage(msg.text)}
					{:else}
						{msg.text}
					{/if}
				</div>

				{#if msg.role === 'user'}
					<div class="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 text-muted-foreground mt-1">
						<User class="w-3.5 h-3.5" />
					</div>
				{/if}
			</div>
		{/each}

		{#if isLoading}
			<div class="flex items-center gap-2 text-xs text-muted-foreground p-1.5">
				<Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
				<span>Computing advisory analysis…</span>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<form onsubmit={(e) => { e.preventDefault(); handleSend(); }} class="pt-2.5 border-t border-border/50 flex items-center gap-2">
		<input
			type="text"
			bind:value={inputQuery}
			placeholder="Enter financial inquiry or budgeting question..."
			disabled={isLoading}
			class="flex-1 px-3 py-2 rounded-lg bg-secondary/30 border border-border/60 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
		/>
		<button
			type="submit"
			disabled={isLoading || !inputQuery.trim()}
			class="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-40 shrink-0 gap-1.5"
		>
			<Send class="w-3.5 h-3.5" />
			<span>Send</span>
		</button>
	</form>
</div>
