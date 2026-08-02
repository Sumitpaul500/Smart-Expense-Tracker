<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	Chart.register(...registerables);

	let { data = [], fmt }: { data: any[]; fmt: (v: number) => string } = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chart = $state<Chart | null>(null);

	function getThemeColors() {
		const isDark = document.documentElement.classList.contains('dark');
		return {
			tickColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
			gridColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)',
		};
	}

	$effect(() => {
		if (chart && data) {
			chart.data.labels = data.map((d) => d.week ?? '');
			chart.data.datasets[0].data = data.map((d) => d.income);
			chart.data.datasets[1].data = data.map((d) => d.expenses);
			chart.update();
		}
	});

	onMount(() => {
		if (!canvasElement) return;
		const ctx = canvasElement.getContext('2d');
		if (!ctx) return;

		const { tickColor, gridColor } = getThemeColors();

		// Gradients
		const incomeGrad = ctx.createLinearGradient(0, 0, 0, 200);
		incomeGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
		incomeGrad.addColorStop(1, 'rgba(4, 120, 87, 0.3)');

		const expenseGrad = ctx.createLinearGradient(0, 0, 0, 200);
		expenseGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
		expenseGrad.addColorStop(1, 'rgba(185, 28, 28, 0.3)');

		chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.week ?? ''),
				datasets: [
					{
						label: 'Income',
						data: data.map((d) => d.income),
						backgroundColor: incomeGrad,
						borderColor: 'rgba(16, 185, 129, 0.3)',
						borderWidth: 1,
						borderRadius: 6,
						barPercentage: 0.8,
						categoryPercentage: 0.6
					},
					{
						label: 'Expenses',
						data: data.map((d) => d.expenses),
						backgroundColor: expenseGrad,
						borderColor: 'rgba(239, 68, 68, 0.3)',
						borderWidth: 1,
						borderRadius: 6,
						barPercentage: 0.8,
						categoryPercentage: 0.6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: 'rgba(15, 23, 42, 0.9)',
						titleColor: '#fff',
						bodyColor: 'rgba(255,255,255,0.85)',
						titleFont: { family: 'Outfit, sans-serif', size: 12, weight: 'bold' },
						bodyFont: { family: 'Outfit, sans-serif', size: 11 },
						borderColor: 'rgba(255, 255, 255, 0.15)',
						borderWidth: 1,
						padding: 10,
						cornerRadius: 10,
						callbacks: {
							label: function (context) {
								let label = context.dataset.label || '';
								if (label) label += ': ';
								if (context.parsed.y !== null) {
									label += fmt(context.parsed.y);
								}
								return label;
							}
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							color: tickColor,
							font: { family: 'Outfit, sans-serif', size: 10 }
						}
					},
					y: {
						grid: { color: gridColor },
						ticks: {
							color: tickColor,
							font: { family: 'Outfit, sans-serif', size: 10 },
							callback: function (value) {
								if (typeof value === 'number') {
									if (value >= 1000) return fmt(value / 1000) + 'k';
									return fmt(value);
								}
								return value;
							}
						}
					}
				}
			}
		});

		// Watch for theme class changes on <html>
		const observer = new MutationObserver(() => {
			if (!chart) return;
			const { tickColor: tc, gridColor: gc } = getThemeColors();
			const opts = chart.options as any;
			opts.scales.x.ticks.color = tc;
			opts.scales.y.ticks.color = tc;
			opts.scales.y.grid.color = gc;
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

<div class="relative w-full h-full min-h-[140px]">
	<canvas bind:this={canvasElement}></canvas>
</div>
