<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	Chart.register(...registerables);

	let { data = [], fmt }: { data: any[]; fmt: (v: number) => string } = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chart = $state<Chart | null>(null);

	const total = $derived(data.reduce((sum, item) => sum + item.total, 0));

	$effect(() => {
		if (chart && data) {
			chart.data.labels = data.map((d) => d.name);
			chart.data.datasets[0].data = data.map((d) => d.total);
			chart.data.datasets[0].backgroundColor = data.map((d) => d.color);
			chart.update();
		}
	});

	function getThemeColors() {
		const isDark = document.documentElement.classList.contains('dark');
		return {
			sliceBorder: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.9)',
			tooltipBg: 'rgba(15, 23, 42, 0.9)',
		};
	}

	onMount(() => {
		if (!canvasElement) return;
		const ctx = canvasElement.getContext('2d');
		if (!ctx) return;

		const { sliceBorder } = getThemeColors();

		chart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: data.map((d) => d.name),
				datasets: [
					{
						data: data.map((d) => d.total),
						backgroundColor: data.map((d) => d.color),
						borderColor: sliceBorder,
						borderWidth: 2,
						hoverOffset: 15,
						borderRadius: 6
					}
				]
			},
			options: {
				cutout: '70%',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false // We use our own customized, beautiful scrollable list legend in HTML
					},
					tooltip: {
						backgroundColor: 'rgba(15, 23, 42, 0.85)',
						titleFont: { family: 'Outfit, sans-serif', size: 13, weight: 'bold' },
						bodyFont: { family: 'Outfit, sans-serif', size: 12 },
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						padding: 12,
						cornerRadius: 12,
						callbacks: {
							label: function (context) {
								const val = context.parsed;
								const pct = total > 0 ? Math.round((val / total) * 100) : 0;
								return ` ${context.label}: ${fmt(val)} (${pct}%)`;
							}
						}
					}
				}
			}
		});

		// Watch for theme switches
		const observer = new MutationObserver(() => {
			if (!chart) return;
			const { sliceBorder: sb } = getThemeColors();
			(chart.data.datasets[0] as any).borderColor = sb;
			chart.update('none');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		return () => observer.disconnect();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<div class="relative w-full h-full flex flex-col items-center justify-center min-h-[160px]">
	<!-- Center Cutout Pill widget for 3D glassmorphic lookup -->
	<div class="absolute w-[80px] h-[80px] md:w-[95px] md:h-[95px] rounded-full bg-card/90 backdrop-blur-xl border border-border/30 shadow-2xl flex flex-col items-center justify-center pointer-events-none z-10">
		<span class="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Total</span>
		<span class="text-xs md:text-sm font-bold text-foreground mt-0.5 tracking-tight">{fmt(total)}</span>
	</div>
	
	<div class="w-full h-full min-h-[150px] relative">
		<canvas bind:this={canvasElement}></canvas>
	</div>
</div>
