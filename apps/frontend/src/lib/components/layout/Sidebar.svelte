<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { uiState, closeSidebar } from '$lib/stores/ui.svelte';
	import { authState, clearAuth } from '$lib/stores/auth.svelte';
	import {
		LayoutDashboard,
		ArrowLeftRight,
		BarChart3,
		Settings,
		LogOut,
		X,
		ScanLine,
		ShieldCheck
	} from 'lucide-svelte';

	const navItems = [
		{ label: 'Dashboard', href: '/', icon: LayoutDashboard },
		{ label: 'AI Reconciliation', href: '/reconciliation', icon: ShieldCheck },
		{ label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
		{ label: 'Scan Receipt', href: '/receipts', icon: ScanLine },
		{ label: 'Analytics', href: '/analytics', icon: BarChart3 },
		{ label: 'Settings', href: '/settings', icon: Settings }
	];

	const userName = $derived(authState.user ? `${authState.user.firstName ?? ''} ${authState.user.lastName ?? ''}`.trim() : 'User');
	const userEmail = $derived(authState.user?.email ?? '');
	const userInitial = $derived((authState.user?.firstName ?? 'U')[0].toUpperCase());

	function handleLogout() {
		clearAuth();
		goto('/login');
	}
</script>

<!-- Mobile overlay -->
{#if uiState.isSidebarOpen}
	<div
		class="fixed inset-0 bg-black/50 z-30 md:hidden"
		onclick={closeSidebar}
		role="presentation"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="
		fixed top-0 left-0 h-full z-40 flex flex-col
		w-64 bg-card border-r border-border
		transition-transform duration-200 ease-in-out
		{uiState.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
		md:relative md:translate-x-0 md:flex md:shrink-0
	"
>
	<!-- Header / Logo -->
	<div class="flex items-center justify-between px-5 py-4 border-b border-border/60">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
				<ShieldCheck class="w-4.5 h-4.5" />
			</div>
			<div>
				<p class="font-semibold text-sm tracking-tight text-foreground">FinPilot AI</p>
				<p class="text-[11px] text-muted-foreground">Financial Platform</p>
			</div>
		</div>
		<!-- Mobile close button -->
		<button
			onclick={closeSidebar}
			class="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary"
			aria-label="Close sidebar"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
		<p class="text-xs font-medium text-muted-foreground px-2 mb-2">Platform</p>
		{#each navItems as item}
			{@const active = item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				onclick={closeSidebar}
				data-sveltekit-preload-data="hover"
				class="
					w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
					transition-colors text-left
					{active
						? 'bg-primary text-primary-foreground font-semibold shadow-xs'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'}
				"
			>
				<item.icon class="w-4 h-4 shrink-0 {active ? 'text-primary-foreground' : 'text-muted-foreground'}" />
				<span>{item.label}</span>
				{#if active}
					<span class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User profile + Logout -->
	<div class="px-3 pb-4 border-t border-border/60 pt-3 space-y-1">
		<!-- User info card -->
		<div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/40 mb-2">
			<div class="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
				<span class="text-xs font-semibold text-primary">{userInitial}</span>
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium text-foreground truncate">{userName}</p>
				<p class="text-[11px] text-muted-foreground truncate">{userEmail}</p>
			</div>
		</div>

		<!-- Logout -->
		<button
			onclick={handleLogout}
			class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors group"
		>
			<LogOut class="w-4 h-4 shrink-0" />
			<span>Sign Out</span>
		</button>
	</div>
</aside>
