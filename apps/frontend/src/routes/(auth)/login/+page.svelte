<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState, login } from '$lib/stores/auth.svelte';
	import { authApi } from '$lib/api';
	import { Wallet, Loader2, Eye, EyeOff } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let error = $state('');

	// Redirect if already logged in
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
	<meta name="description" content="Sign in to FinPilot AI — your AI-powered financial copilot." />
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4">
	<!-- Decorative gradient orbs -->
	<div class="absolute inset-0 pointer-events-none overflow-hidden">
		<div
			class="absolute -top-60 -left-60 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]"
		></div>
		<div
			class="absolute -bottom-60 -right-60 w-[500px] h-[500px] bg-indigo/10 rounded-full blur-[120px]"
		></div>
		<div
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan/5 rounded-full blur-[80px]"
		></div>
	</div>

	<!-- Subtle grid overlay -->
	<div
		class="absolute inset-0 pointer-events-none"
		style="background-image: linear-gradient(to right, #1e234008 1px, transparent 1px), linear-gradient(to bottom, #1e234008 1px, transparent 1px); background-size: 32px 32px;"
	></div>

	<div class="relative z-10 w-full max-w-[420px]">
		<!-- Logo mark -->
		<div class="flex flex-col items-center mb-8">
			<div
				class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-2xl shadow-primary/40"
			>
				<Wallet class="w-7 h-7 text-white" />
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">FinPilot AI</h1>
			<p class="text-muted-foreground mt-1.5 text-sm">Your AI-powered financial copilot</p>
		</div>

		<!-- Card -->
		<div
			class="bg-card border border-border/60 rounded-2xl p-8 shadow-2xl shadow-black/60 backdrop-blur-xl"
		>
			<h2 class="text-xl font-semibold mb-1">Welcome back</h2>
			<p class="text-muted-foreground text-sm mb-6">Sign in to continue to your dashboard</p>

			{#if error}
				<div
					class="mb-5 p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-center gap-2"
				>
					<span class="shrink-0 font-bold">!</span>
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Email -->
				<div class="space-y-1.5">
					<label for="email" class="text-sm font-medium text-foreground">Email address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						autocomplete="email"
						required
						class="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="password" class="text-sm font-medium text-foreground">Password</label>
						<a href="/forgot-password" class="text-xs text-primary hover:underline"
							>Forgot password?</a
						>
					</div>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="••••••••"
							autocomplete="current-password"
							required
							class="w-full px-4 py-2.5 pr-11 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Toggle password visibility"
						>
							{#if showPassword}
								<EyeOff class="w-4 h-4" />
							{:else}
								<Eye class="w-4 h-4" />
							{/if}
						</button>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2"
				>
					{#if isLoading}
						<Loader2 class="w-4 h-4 animate-spin" />
						Signing in…
					{:else}
						Sign In
					{/if}
				</button>
			</form>

			<p class="mt-6 text-center text-sm text-muted-foreground">
				Don't have an account?
				<a href="/register" class="text-primary hover:underline font-medium">Create one free</a>
			</p>
		</div>

		<p class="mt-6 text-center text-xs text-muted-foreground">
			Protected by industry-standard encryption
		</p>
	</div>
</div>
