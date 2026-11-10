<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState, login } from '$lib/stores/auth.svelte';
	import { authApi } from '$lib/api';
	import { ShieldCheck, Loader2, Eye, EyeOff, User, Mail, Lock, CheckCircle2 } from 'lucide-svelte';
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
			{ label: 'Moderate', color: 'bg-amber-500' },
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
				const field = issue.path[0] as string;
				if (!errs[field]) errs[field] = issue.message;
			}
			fieldErrors = errs;
			return;
		}

		isLoading = true;
		try {
			const data = await authApi.register({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.trim().toLowerCase(),
				password
			});

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
		} catch (err: any) {
			error = err.message ?? 'Registration failed. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Account — FinPilot AI</title>
	<meta
		name="description"
		content="Register an institutional FinPilot account to track expenses, parse receipts, and manage automated reconciliation."
	/>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-4 py-8">
	<div class="relative z-10 w-full max-w-[420px]">
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
			<h2 class="text-base font-semibold mb-1 text-foreground">Create Account</h2>
			<p class="text-muted-foreground text-xs mb-5">Set up your profile to access financial ledgers</p>

			<!-- Global error -->
			{#if error}
				<div class="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-destructive text-xs flex items-center gap-2">
					<span class="shrink-0 font-bold">!</span>
					<span>{error}</span>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-3.5">
				<!-- Name row -->
				<div class="grid grid-cols-2 gap-3">
					<!-- First name -->
					<div class="space-y-1">
						<label for="firstName" class="text-xs font-medium text-foreground">First name</label>
						<div class="relative">
							<User class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
							<input
								id="firstName"
								type="text"
								bind:value={firstName}
								placeholder="Jane"
								autocomplete="given-name"
								class="w-full pl-8 pr-3 py-2 bg-secondary/30 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground
									{fieldErrors.firstName ? 'border-destructive' : 'border-border/70'}"
							/>
						</div>
						{#if fieldErrors.firstName}
							<p class="text-[11px] text-destructive">{fieldErrors.firstName}</p>
						{/if}
					</div>

					<!-- Last name -->
					<div class="space-y-1">
						<label for="lastName" class="text-xs font-medium text-foreground">Last name</label>
						<div class="relative">
							<User class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
							<input
								id="lastName"
								type="text"
								bind:value={lastName}
								placeholder="Doe"
								autocomplete="family-name"
								class="w-full pl-8 pr-3 py-2 bg-secondary/30 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground
									{fieldErrors.lastName ? 'border-destructive' : 'border-border/70'}"
							/>
						</div>
						{#if fieldErrors.lastName}
							<p class="text-[11px] text-destructive">{fieldErrors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Email -->
				<div class="space-y-1">
					<label for="email" class="text-xs font-medium text-foreground">Email address</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="jane.doe@example.com"
							autocomplete="email"
							class="w-full pl-8 pr-3 py-2 bg-secondary/30 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground
								{fieldErrors.email ? 'border-destructive' : 'border-border/70'}"
						/>
					</div>
					{#if fieldErrors.email}
						<p class="text-[11px] text-destructive">{fieldErrors.email}</p>
					{/if}
				</div>

				<!-- Password -->
				<div class="space-y-1">
					<label for="password" class="text-xs font-medium text-foreground">Password</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Min. 8 characters"
							autocomplete="new-password"
							class="w-full pl-8 pr-9 py-2 bg-secondary/30 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground
								{fieldErrors.password ? 'border-destructive' : 'border-border/70'}"
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

					<!-- Password strength meter -->
					{#if password}
						<div class="space-y-1 pt-1">
							<div class="flex gap-1">
								{#each [1, 2, 3, 4] as step}
									<div
										class="h-1 flex-1 rounded-full transition-all duration-300
											{passwordStrength.score >= step ? passwordStrength.color : 'bg-secondary'}"
									></div>
								{/each}
							</div>
							<p class="text-[11px] text-muted-foreground">
								Strength: <span class="font-medium text-foreground">{passwordStrength.label}</span>
							</p>
						</div>
					{/if}
					{#if fieldErrors.password}
						<p class="text-[11px] text-destructive">{fieldErrors.password}</p>
					{/if}
				</div>

				<!-- Confirm password -->
				<div class="space-y-1">
					<label for="confirmPassword" class="text-xs font-medium text-foreground">Confirm password</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
						<input
							id="confirmPassword"
							type={showConfirm ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Repeat password"
							autocomplete="new-password"
							class="w-full pl-8 pr-9 py-2 bg-secondary/30 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground
								{fieldErrors.confirmPassword ? 'border-destructive' : confirmPassword && confirmPassword === password ? 'border-emerald-500/80' : 'border-border/70'}"
						/>
						<div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
							{#if confirmPassword && confirmPassword === password}
								<CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
							{:else}
								<button
									type="button"
									onclick={() => (showConfirm = !showConfirm)}
									class="text-muted-foreground hover:text-foreground transition-colors p-1"
									aria-label="Toggle confirm password visibility"
								>
									{#if showConfirm}
										<EyeOff class="w-3.5 h-3.5" />
									{:else}
										<Eye class="w-3.5 h-3.5" />
									{/if}
								</button>
							{/if}
						</div>
					</div>
					{#if fieldErrors.confirmPassword}
						<p class="text-[11px] text-destructive">{fieldErrors.confirmPassword}</p>
					{/if}
				</div>

				<!-- Submit -->
				<button
					type="submit"
					disabled={isLoading}
					id="register-submit"
					class="w-full py-2 px-4 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs mt-2"
				>
					{#if isLoading}
						<Loader2 class="w-3.5 h-3.5 animate-spin" />
						Creating account…
					{:else}
						Create Account
					{/if}
				</button>
			</form>

			<p class="mt-5 text-center text-xs text-muted-foreground">
				Already have an account?
				<a href="/login" class="text-primary hover:underline font-medium">Sign in</a>
			</p>
		</div>

		<p class="mt-4 text-center text-[11px] text-muted-foreground">
			Protected by industry-standard encryption
		</p>
	</div>
</div>
