<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { uiState, toggleChat, closeChat } from '$lib/stores/ui.svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { aiApi } from '$lib/api';
	import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-svelte';
	import { tick } from 'svelte';

	interface Message {
		id: number;
		text: string;
		sender: 'user' | 'ai';
	}

	let messages = $state<Message[]>([
		{
			id: 1,
			text: "FinPilot Assistant online. Inquire about ledger transactions, category variances, or cash flow forecasting.",
			sender: 'ai',
		},
	]);
	let input = $state('');
	let isLoading = $state(false);
	let messagesEl = $state<HTMLDivElement | null>(null);

	async function scrollToBottom() {
		await tick();
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	}

	async function handleSend() {
		const text = input.trim();
		if (!text || isLoading) return;

		messages = [...messages, { id: Date.now(), text, sender: 'user' }];
		input = '';
		isLoading = true;
		await scrollToBottom();

		try {
			const data = await aiApi.chat(text);
			messages = [
				...messages,
				{
					id: Date.now() + 1,
					text: data.reply ?? 'No response received from AI service.',
					sender: 'ai',
				},
			];
		} catch (e: any) {
			console.error('[ChatWidget] AI request failed:', e.message);
			const errText =
				e.message?.includes('Not authorized') || e.message?.includes('jwt')
					? 'Authentication expired. Please sign in again.'
					: e.message?.includes('quota') || e.message?.includes('429') || e.message?.includes('Too Many')
					? 'Service rate limit reached for the current period. Please retry shortly.'
					: e.message?.includes('API key') || e.message?.includes('GEMINI')
					? 'AI service key not configured in backend environment.'
					: e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')
					? 'Backend server unreachable at configured port.'
					: `Service error: ${e.message ?? 'Please try again.'}`;

			messages = [
				...messages,
				{
					id: Date.now() + 1,
					text: errText,
					sender: 'ai',
				},
			];
		} finally {
			isLoading = false;
			await scrollToBottom();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<!-- FAB toggle button -->
<button
	onclick={toggleChat}
	aria-label="Toggle AI Chat"
	class="fixed bottom-6 right-6 w-11 h-11 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors z-50"
>
	{#if uiState.isChatOpen}
		<X class="w-5 h-5" />
	{:else}
		<MessageSquare class="w-5 h-5" />
	{/if}
</button>

<!-- Chat panel -->
{#if uiState.isChatOpen}
	<div
		transition:fly={{ y: 16, duration: 200, opacity: 0 }}
		class="fixed bottom-20 right-6 w-80 sm:w-[360px] h-[480px] bg-card border border-border/80 rounded-xl shadow-lg flex flex-col z-50 overflow-hidden"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/40"
		>
			<div class="flex items-center gap-2.5">
				<div
					class="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center"
				>
					<Bot class="w-4 h-4 text-primary" />
				</div>
				<div>
					<p class="font-medium text-xs text-foreground">FinPilot Assistant</p>
					<div class="flex items-center gap-1.5 mt-0.5">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
						<span class="text-[10px] text-muted-foreground">Operational</span>
					</div>
				</div>
			</div>
			<button
				onclick={closeChat}
				class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary"
				aria-label="Close chat"
			>
				<X class="w-4 h-4" />
			</button>
		</div>

		<!-- Message list -->
		<div
			bind:this={messagesEl}
			class="flex-1 overflow-y-auto p-3.5 space-y-2.5"
		>
			{#each messages as msg (msg.id)}
				<div
					class="flex {msg.sender === 'user' ? 'justify-end' : 'justify-start'}"
					in:fade={{ duration: 100 }}
				>
					<div
						class="max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed
							{msg.sender === 'user'
							? 'bg-primary text-primary-foreground font-medium'
							: 'bg-secondary/40 text-foreground border border-border/50'}"
					>
						{msg.text}
					</div>
				</div>
			{/each}

			{#if isLoading}
				<div class="flex justify-start" in:fade={{ duration: 100 }}>
					<div
						class="bg-secondary/40 border border-border/50 px-3 py-2 rounded-lg flex gap-1.5 items-center text-xs text-muted-foreground"
					>
						<Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
						<span>Thinking…</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input row -->
		<div class="px-3 py-2.5 border-t border-border/60 bg-card flex items-center gap-2">
			<input
				type="text"
				bind:value={input}
				onkeydown={onKeydown}
				placeholder="Type financial question…"
				disabled={isLoading}
				class="flex-1 bg-secondary/30 border border-border/70 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground disabled:opacity-50"
			/>
			<button
				onclick={handleSend}
				disabled={!input.trim() || isLoading}
				class="w-7 h-7 bg-primary text-primary-foreground rounded-md flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
				aria-label="Send message"
			>
				{#if isLoading}
					<Loader2 class="w-3.5 h-3.5 animate-spin" />
				{:else}
					<Send class="w-3.5 h-3.5" />
				{/if}
			</button>
		</div>
	</div>
{/if}
