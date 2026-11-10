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
		<div class="flex flex-col items-center gap-3">
			<div
				class="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
			></div>
			<p class="text-xs text-muted-foreground">Loading FinPilot…</p>
		</div>
	</div>
{:else}
	<div class="flex h-screen bg-background text-foreground overflow-hidden">
		<!-- Sidebar -->
		<Sidebar />

		<!-- Main content area -->
		<main class="flex-1 overflow-y-auto relative flex flex-col min-w-0">
			<!-- Top bar (mobile menu + breadcrumb) -->
			<header
				class="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/90 backdrop-blur-md md:hidden"
			>
				<div class="flex items-center gap-3">
					<button
						onclick={toggleSidebar}
						class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
						aria-label="Toggle sidebar"
					>
						<Menu class="w-5 h-5" />
					</button>
					<span class="font-semibold text-sm tracking-tight">FinPilot AI</span>
				</div>
			</header>

			<!-- Page content -->
			<div class="flex-1 px-4 py-6 md:px-8 md:py-8 relative z-10 max-w-[1600px] w-full mx-auto">
				{@render children()}
			</div>
		</main>

		<!-- Floating AI chat widget -->
		<ChatWidget />
	</div>
{/if}
