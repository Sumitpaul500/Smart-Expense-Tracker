<script lang="ts">
	import { aiApi } from '$lib/api';
	import { uiState } from '$lib/stores/ui.svelte';
	import {
		Bot,
		Sparkles,
		Send,
		Loader2,
		AlertCircle,
		TrendingUp,
		ShieldAlert,
		Lightbulb,
		Zap,
		User
	} from 'lucide-svelte';

	let { contextSummary }: { contextSummary?: string } = $props();

	let messages = $state<Array<{ role: 'user' | 'assistant'; text: string }>>([
		{
			role: 'assistant',
			text: `Hello! I'm **FinPilot AI**, your personal financial advisor. Ask me anything about your spending, budget optimization, or click one of the quick prompts below!`
		}
	]);

	let inputQuery = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const QUICK_PROMPTS = [
		{ label: '📊 Analyze spending habits', prompt: 'Analyze my spending habits and tell me where I can cut costs.' },
		{ label: '💰 How to save more', prompt: `How can I save more money this month in ${uiState.currency}?` },
		{ label: '🚨 Detect abnormal expenses', prompt: 'Check if I have any unusually high or abnormal expenses.' },
		{ label: '🎯 3 Financial Rules', prompt: 'Give me 3 actionable financial rules for smart budgeting.' }
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
					text: 'Sorry, I encountered an issue reaching the AI backend. Please make sure the server is running.'
				}
			];
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="bg-card border border-border/60 rounded-3xl p-6 shadow-xl flex flex-col h-full min-h-[420px] relative overflow-hidden">
	<!-- Top Glow -->
	<div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

	<!-- Header -->
	<div class="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
				<Bot class="w-5 h-5" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h3 class="font-bold text-base tracking-tight">FinPilot AI Advisor</h3>
					<span class="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">Active</span>
				</div>
				<p class="text-xs text-muted-foreground">Smart financial analysis & expense intelligence</p>
			</div>
		</div>
	</div>

	<!-- Quick Prompt Pills -->
	<div class="flex items-center gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
		{#each QUICK_PROMPTS as pill}
			<button
				type="button"
				onclick={() => handleSend(pill.prompt)}
				disabled={isLoading}
				class="shrink-0 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 disabled:opacity-50"
			>
				<Sparkles class="w-3 h-3 text-primary" />
				{pill.label}
			</button>
		{/each}
	</div>

	<!-- Chat Conversation Stream -->
	<div class="flex-1 overflow-y-auto space-y-3 pr-1 my-2 max-h-[300px]">
		{#each messages as msg}
			<div class="flex gap-3 {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if msg.role === 'assistant'}
					<div class="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 text-primary mt-1">
						<Bot class="w-4 h-4" />
					</div>
				{/if}

				<div
					class="max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed
					{msg.role === 'user'
						? 'bg-primary text-white font-medium rounded-tr-none shadow-md shadow-primary/20'
						: 'bg-secondary/60 border border-border/50 text-foreground rounded-tl-none'}"
				>
					{@html msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}
				</div>

				{#if msg.role === 'user'}
					<div class="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground mt-1">
						<User class="w-4 h-4" />
					</div>
				{/if}
			</div>
		{/each}

		{#if isLoading}
			<div class="flex items-center gap-2 text-xs text-muted-foreground p-2">
				<Loader2 class="w-4 h-4 animate-spin text-primary" />
				<span>FinPilot AI is analyzing financial data...</span>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<form onsubmit={(e) => { e.preventDefault(); handleSend(); }} class="pt-3 border-t border-border/40 flex items-center gap-2">
		<input
			type="text"
			bind:value={inputQuery}
			placeholder="Ask FinPilot AI about your money, budget, or savings..."
			disabled={isLoading}
			class="flex-1 px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all"
		/>
		<button
			type="submit"
			disabled={isLoading || !inputQuery.trim()}
			class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-40 shrink-0"
		>
			<Send class="w-4 h-4" />
		</button>
	</form>
</div>
