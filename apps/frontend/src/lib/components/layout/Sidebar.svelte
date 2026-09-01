<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { uiState, closeSidebar, setTheme } from '$lib/stores/ui.svelte';
	import { authState, clearAuth } from '$lib/stores/auth.svelte';
	import {
		LayoutDashboard,
		ArrowLeftRight,
		BarChart3,
		Settings,
		LogOut,
		TrendingUp,
		X,
		Sun,
		Moon,
		Monitor,
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
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
		onclick={closeSidebar}
		role="presentation"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="
		fixed top-0 left-0 h-full z-40 flex flex-col
		w-64 bg-card border-r border-border/50
		transition-transform duration-300 ease-in-out
		{uiState.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
		md:relative md:translate-x-0 md:flex md:shrink-0
	"
>
	<!-- Header / Logo -->
	<div class="flex items-center justify-between px-5 py-5 border-b border-border/40">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
				<ShieldCheck class="w-4.5 h-4.5 text-white" />
			</div>
			<div>
				<p class="font-bold text-sm tracking-tight text-foreground">FinPilot AI</p>
				<p class="text-[10px] text-primary font-medium">Finance Controller</p>
			</div>
		</div>
		<!-- Mobile close button -->
		<button
			onclick={closeSidebar}
			class="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
			aria-label="Close sidebar"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
		<p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-3">Menu</p>
		{#each navItems as item}
			{@const active = item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				onclick={closeSidebar}
				data-sveltekit-preload-data="hover"
				class="
					w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
					transition-all duration-150 group text-left
					{active
						? 'bg-primary text-white shadow-md shadow-primary/30'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}
				"
			>
				<item.icon class="w-4 h-4 shrink-0 {active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}" />
				{item.label}
				{#if active}
					<span class="ml-auto w-1.5 h-1.5 rounded-full bg-white/70"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User profile + Logout -->
	<div class="px-3 pb-4 border-t border-border/40 pt-3 space-y-1">
		<!-- User info card -->
		<div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 mb-2">
			<div class="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
				<span class="text-xs font-bold text-primary">{userInitial}</span>
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-foreground truncate">{userName}</p>
				<p class="text-[11px] text-muted-foreground truncate">{userEmail}</p>
			</div>
		</div>

		<!-- Logout -->
		<button
			onclick={handleLogout}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 group"
		>
			<LogOut class="w-4 h-4 shrink-0 group-hover:text-red-400" />
			Sign Out
		</button>
	</div>
</aside>
