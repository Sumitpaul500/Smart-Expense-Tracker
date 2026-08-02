<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState, login } from '$lib/stores/auth.svelte';
	import { authApi } from '$lib/api';
	import { Wallet, Loader2, Eye, EyeOff, User, Mail, Lock, CheckCircle2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { z } from 'zod';

	// ─── Form state ───────────────────────────────────────────────────────────────
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirm = $state(false);
	let isLoading = $state(false);
	let error = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	// Redirect if already logged in
	onMount(() => {
		if (authState.isAuthenticated) {
			goto('/');
		}
	});

	// ─── Zod validation schema ────────────────────────────────────────────────────
	const registerSchema = z
		.object({
			firstName: z.string().min(1, 'First name is required').max(50),
			lastName: z.string().min(1, 'Last name is required').max(50),
			email: z.string().email('Please enter a valid email address'),
			password: z
				.string()
				.min(8, 'Password must be at least 8 characters')
				.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
				.regex(/[0-9]/, 'Password must contain at least one number'),
			confirmPassword: z.string()
		})
		.refine((d) => d.password === d.confirmPassword, {
			message: 'Passwords do not match',
			path: ['confirmPassword']
		});

	// ─── Password strength ────────────────────────────────────────────────────────
	const passwordStrength = $derived.by(() => {
		if (!password) return { score: 0, label: '', color: '' };
		let score = 0;
		if (password.length >= 8) score++;
		if (/[A-Z]/.test(password)) score++;
		if (/[0-9]/.test(password)) score++;
		if (/[^a-zA-Z0-9]/.test(password)) score++;
		const map = [
			{ label: 'Too short', color: 'bg-destructive' },
			{ label: 'Weak', color: 'bg-destructive' },
			{ label: 'Fair', color: 'bg-amber-500' },
			{ label: 'Good', color: 'bg-emerald-400' },
			{ label: 'Strong', color: 'bg-emerald-500' }
		];
		return { score, ...map[score] };
	});

	// ─── Submit handler ───────────────────────────────────────────────────────────
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		fieldErrors = {};
		error = '';

		const result = registerSchema.safeParse({
			firstName,
			lastName,
			email,
			password,
			confirmPassword
		});

		if (!result.success) {
			const errs: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string;
				errs[key] = issue.message;
			}
			fieldErrors = errs;
			return;
		}

		isLoading = true;

		try {
			const data = await authApi.register({ firstName, lastName, email, password });

			// Backend returns { _id, email, firstName, lastName, token } directly
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
			error = e.message ?? 'Registration failed. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Account — FinPilot AI</title>
	<meta
		name="description"
		content="Create your free FinPilot AI account and take control of your finances with AI-powered insights."
	/>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4 py-10">
	<!-- Decorative gradient orbs -->
	<div class="absolute inset-0 pointer-events-none overflow-hidden">
		<div class="absolute -top-60 -right-60 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]"></div>
		<div class="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px]"></div>
	</div>

	<!-- Subtle grid overlay -->
	<div
		class="absolute inset-0 pointer-events-none"
		style="background-image: linear-gradient(to right, #1e234008 1px, transparent 1px), linear-gradient(to bottom, #1e234008 1px, transparent 1px); background-size: 32px 32px;"
	></div>

	<div class="relative z-10 w-full max-w-[460px]">
		<!-- Logo mark -->
		<div class="flex flex-col items-center mb-8">
			<div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-2xl shadow-primary/40">
				<Wallet class="w-7 h-7 text-white" />
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">FinPilot AI</h1>
			<p class="text-muted-foreground mt-1.5 text-sm">Your AI-powered financial copilot</p>
		</div>

		<!-- Card -->
		<div class="bg-card border border-border/60 rounded-2xl p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
			<h2 class="text-xl font-semibold mb-1">Create your account</h2>
			<p class="text-muted-foreground text-sm mb-6">Get started free — no credit card required</p>

			<!-- Global error -->
			{#if error}
				<div class="mb-5 p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-center gap-2">
					<span class="shrink-0 font-bold">!</span>
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Name row -->
				<div class="grid grid-cols-2 gap-3">
					<!-- First name -->
					<div class="space-y-1.5">
						<label for="firstName" class="text-sm font-medium text-foreground">First name</label>
						<div class="relative">
							<User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<input
								id="firstName"
								type="text"
								bind:value={firstName}
								placeholder="Jane"
								autocomplete="given-name"
								class="w-full pl-9 pr-4 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground
									{fieldErrors.firstName ? 'border-destructive' : 'border-border'}"
							/>
						</div>
						{#if fieldErrors.firstName}
							<p class="text-xs text-destructive">{fieldErrors.firstName}</p>
						{/if}
					</div>

					<!-- Last name -->
					<div class="space-y-1.5">
						<label for="lastName" class="text-sm font-medium text-foreground">Last name</label>
						<div class="relative">
							<User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<input
								id="lastName"
								type="text"
								bind:value={lastName}
								placeholder="Doe"
								autocomplete="family-name"
								class="w-full pl-9 pr-4 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground
									{fieldErrors.lastName ? 'border-destructive' : 'border-border'}"
							/>
						</div>
						{#if fieldErrors.lastName}
							<p class="text-xs text-destructive">{fieldErrors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Email -->
				<div class="space-y-1.5">
					<label for="email" class="text-sm font-medium text-foreground">Email address</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="you@example.com"
							autocomplete="email"
							class="w-full pl-9 pr-4 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground
								{fieldErrors.email ? 'border-destructive' : 'border-border'}"
						/>
					</div>
					{#if fieldErrors.email}
						<p class="text-xs text-destructive">{fieldErrors.email}</p>
					{/if}
				</div>

				<!-- Password -->
				<div class="space-y-1.5">
					<label for="password" class="text-sm font-medium text-foreground">Password</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Min. 8 characters"
							autocomplete="new-password"
							class="w-full pl-9 pr-11 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground
								{fieldErrors.password ? 'border-destructive' : 'border-border'}"
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

					<!-- Password strength meter -->
					{#if password}
						<div class="space-y-1">
							<div class="flex gap-1">
								{#each [1, 2, 3, 4] as step}
									<div
										class="h-1 flex-1 rounded-full transition-all duration-300
											{passwordStrength.score >= step ? passwordStrength.color : 'bg-border'}"
									></div>
								{/each}
							</div>
							<p class="text-xs text-muted-foreground">
								Strength: <span class="font-medium text-foreground">{passwordStrength.label}</span>
							</p>
						</div>
					{/if}
					{#if fieldErrors.password}
						<p class="text-xs text-destructive">{fieldErrors.password}</p>
					{/if}
				</div>

				<!-- Confirm password -->
				<div class="space-y-1.5">
					<label for="confirmPassword" class="text-sm font-medium text-foreground">Confirm password</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							id="confirmPassword"
							type={showConfirm ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Repeat your password"
							autocomplete="new-password"
							class="w-full pl-9 pr-11 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground
								{fieldErrors.confirmPassword ? 'border-destructive' : confirmPassword && confirmPassword === password ? 'border-emerald-500' : 'border-border'}"
						/>
						<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
							{#if confirmPassword && confirmPassword === password}
								<CheckCircle2 class="w-4 h-4 text-emerald-500" />
							{:else}
								<button
									type="button"
									onclick={() => (showConfirm = !showConfirm)}
									class="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Toggle confirm password visibility"
								>
									{#if showConfirm}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							{/if}
						</div>
					</div>
					{#if fieldErrors.confirmPassword}
						<p class="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
					{/if}
				</div>

				<!-- Terms note -->
				<p class="text-xs text-muted-foreground">
					By creating an account you agree to our
					<a href="/terms" class="text-primary hover:underline">Terms of Service</a>
					and
					<a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>.
				</p>

				<!-- Submit -->
				<button
					type="submit"
					disabled={isLoading}
					id="register-submit"
					class="w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2"
				>
					{#if isLoading}
						<Loader2 class="w-4 h-4 animate-spin" />
						Creating account…
					{:else}
						Create free account
					{/if}
				</button>
			</form>

			<p class="mt-6 text-center text-sm text-muted-foreground">
				Already have an account?
				<a href="/login" class="text-primary hover:underline font-medium">Sign in</a>
			</p>
		</div>

		<p class="mt-6 text-center text-xs text-muted-foreground">
			Protected by industry-standard encryption
		</p>
	</div>
</div>
