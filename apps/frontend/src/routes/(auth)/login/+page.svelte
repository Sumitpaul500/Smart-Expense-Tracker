<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState, login } from '$lib/stores/auth.svelte';
	import { authApi } from '$lib/api';
	import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let error = $state('');

	onMount(() => {
		if (authState.isAuthenticated) {
			goto('/');
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!email.trim() || !password.trim()) {
			error = 'Please fill in all fields.';
			return;
		}
		isLoading = true;
		error = '';

		try {
			const data = await authApi.login(email, password);

			login(
				{
					id: data._id,
					email: data.email,
					firstName: data.firstName,
					lastName: data.lastName
				},
				data.token
			);
			goto('/');
		} catch (e: any) {
			error = e.message ?? 'Invalid email or password.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In — FinPilot AI</title>
	<meta name="description" content="Sign in to FinPilot AI — financial ledger management and reconciliation." />
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
	<div class="relative z-10 w-full max-w-[400px]">
		<!-- Logo mark -->
		<div class="flex flex-col items-center mb-6">
			<div class="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-3">
				<ShieldCheck class="w-5 h-5" />
			</div>
			<h1 class="text-xl font-semibold tracking-tight text-foreground">FinPilot AI</h1>
			<p class="text-muted-foreground mt-0.5 text-xs">Financial Control & Ledger Intelligence</p>
		</div>

		<!-- Card -->
		<div class="bg-card border border-border/80 rounded-xl p-6 shadow-xs">
			<h2 class="text-base font-semibold mb-1 text-foreground">Sign In</h2>
			<p class="text-muted-foreground text-xs mb-5">Enter your credentials to access the platform</p>

			{#if error}
				<div class="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-destructive text-xs flex items-center gap-2">
					<span class="shrink-0 font-bold">!</span>
					<span>{error}</span>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-3.5">
				<!-- Email -->
				<div class="space-y-1">
					<label for="email" class="text-xs font-medium text-foreground">Email address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="user@example.com"
						autocomplete="email"
						required
						class="w-full px-3 py-2 bg-secondary/30 border border-border/70 rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label for="password" class="text-xs font-medium text-foreground">Password</label>
					</div>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="••••••••"
							autocomplete="current-password"
							required
							class="w-full px-3 py-2 pr-9 bg-secondary/30 border border-border/70 rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
							aria-label="Toggle password visibility"
						>
							{#if showPassword}
								<EyeOff class="w-3.5 h-3.5" />
							{:else}
								<Eye class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-2 px-4 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs mt-2"
				>
					{#if isLoading}
						<Loader2 class="w-3.5 h-3.5 animate-spin" />
						Signing In…
					{:else}
						Sign In to Dashboard
					{/if}
				</button>
			</form>

			<p class="mt-5 text-center text-xs text-muted-foreground">
				Don't have an account?
				<a href="/register" class="text-primary hover:underline font-medium">Create account</a>
			</p>
		</div>

		<p class="mt-4 text-center text-[11px] text-muted-foreground">
			Institutional-grade session security and ledger integrity
		</p>
	</div>
</div>
