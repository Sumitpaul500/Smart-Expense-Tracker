<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { uiState, toggleSidebar } from '$lib/stores/ui.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ChatWidget from '$lib/components/shared/ChatWidget.svelte';
	import { Menu } from 'lucide-svelte';

	let { children } = $props();
	let mounted = $state(false);

	onMount(() => {
		if (!authState.isAuthenticated) {
			goto('/login');
		} else {
			mounted = true;
		}
	});
</script>

{#if !mounted}
	<!-- Splash loader while auth check runs -->
	<div class="flex h-screen items-center justify-center bg-background">
		<div class="flex flex-col items-center gap-4">
			<div
				class="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
			></div>
			<p class="text-sm text-muted-foreground">Loading FinPilot AI…</p>
		</div>
	</div>
{:else}
	<div class="flex h-screen bg-background text-foreground overflow-hidden">
		<!-- Sidebar -->
		<Sidebar />

		<!-- Main content area -->
		<main class="flex-1 overflow-y-auto relative flex flex-col min-w-0">
			<!-- Decorative background layers -->
			<div
				class="absolute inset-0 pointer-events-none"
				style="background-image: linear-gradient(to right, #1e234010 1px, transparent 1px), linear-gradient(to bottom, #1e234010 1px, transparent 1px); background-size: 24px 24px; mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, black 60%, transparent 100%);"
			></div>
			<div
				class="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
			></div>

			<!-- Top bar (mobile menu + breadcrumb) -->
			<header
				class="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm md:hidden"
			>
				<button
					onclick={toggleSidebar}
					class="text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Toggle sidebar"
				>
					<Menu class="w-5 h-5" />
				</button>
				<span class="font-semibold text-sm">FinPilot AI</span>
			</header>

			<!-- Page content -->
			<div class="flex-1 px-4 py-6 md:px-8 md:py-8 relative z-10">
				{@render children()}
			</div>
		</main>

		<!-- Floating AI chat widget -->
		<ChatWidget />
	</div>
{/if}
