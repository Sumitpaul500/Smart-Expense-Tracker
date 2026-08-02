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
			text: "Hi! I'm FinPilot AI. Ask me anything about your finances — spending patterns, budget tips, or transaction summaries.",
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
					text: data.reply ?? 'No response received from AI.',
					sender: 'ai',
				},
			];
		} catch (e: any) {
			console.error('[ChatWidget] AI request failed:', e.message);
			const errText =
				e.message?.includes('Not authorized') || e.message?.includes('jwt')
					? 'Please log in again to use the AI chat.'
					: e.message?.includes('quota') || e.message?.includes('429') || e.message?.includes('Too Many')
					? '⚠️ AI quota exceeded for today. The limit resets daily. Try again tomorrow or check your Google AI Studio plan.'
					: e.message?.includes('API key') || e.message?.includes('GEMINI')
					? '⚠️ AI not configured. Check GEMINI_API_KEY in backend .env'
					: e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')
					? '⚠️ Cannot reach the backend. Make sure the server is running on port 5000.'
					: `⚠️ ${e.message ?? 'Something went wrong. Please try again.'}`;

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
	class="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-110 hover:shadow-primary/60 transition-all duration-200 z-50"
>
	{#if uiState.isChatOpen}
		<X class="w-6 h-6" />
	{:else}
		<MessageSquare class="w-6 h-6" />
	{/if}
</button>

<!-- Chat panel -->
{#if uiState.isChatOpen}
	<div
		transition:fly={{ y: 24, duration: 250, opacity: 0 }}
		class="fixed bottom-24 right-6 w-80 sm:w-[380px] h-[530px] bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/60 flex flex-col z-50 overflow-hidden backdrop-blur-xl"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/50 backdrop-blur-md"
		>
			<div class="flex items-center gap-2.5">
				<div
					class="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center"
				>
					<Bot class="w-4 h-4 text-primary" />
				</div>
				<div>
					<p class="font-semibold text-sm leading-none">FinPilot AI</p>
					<div class="flex items-center gap-1 mt-1">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse block"></span>
						<span class="text-[11px] text-muted-foreground">Online</span>
					</div>
				</div>
			</div>
			<button
				onclick={closeChat}
				class="text-muted-foreground hover:text-foreground transition-colors p-1"
				aria-label="Close chat"
			>
				<X class="w-4 h-4" />
			</button>
		</div>

		<!-- Message list -->
		<div
			bind:this={messagesEl}
			class="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
		>
			{#each messages as msg (msg.id)}
				<div
					class="flex {msg.sender === 'user' ? 'justify-end' : 'justify-start'}"
					in:fade={{ duration: 150 }}
				>
					<div
						class="max-w-[84%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
							{msg.sender === 'user'
							? 'bg-primary text-white rounded-br-sm'
							: 'bg-secondary text-foreground rounded-bl-sm border border-border/60'}"
					>
						{msg.text}
					</div>
				</div>
			{/each}

			{#if isLoading}
				<div class="flex justify-start" in:fade={{ duration: 100 }}>
					<div
						class="bg-secondary border border-border/60 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center"
					>
						<span
							class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
							style="animation-delay: 0ms"
						></span>
						<span
							class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
							style="animation-delay: 150ms"
						></span>
						<span
							class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
							style="animation-delay: 300ms"
						></span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input row -->
		<div class="px-3 py-3 border-t border-border/60 bg-card flex items-center gap-2">
			<input
				type="text"
				bind:value={input}
				onkeydown={onKeydown}
				placeholder="Ask about your finances…"
				disabled={isLoading}
				class="flex-1 bg-input border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground disabled:opacity-60"
			/>
			<button
				onclick={handleSend}
				disabled={!input.trim() || isLoading}
				class="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-all shrink-0"
				aria-label="Send message"
			>
				{#if isLoading}
					<Loader2 class="w-4 h-4 animate-spin" />
				{:else}
					<Send class="w-4 h-4" />
				{/if}
			</button>
		</div>
	</div>
{/if}
