<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	Chart.register(...registerables);

	let { data = [], fmt }: { data: any[]; fmt: (v: number) => string } = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chart = $state<Chart | null>(null);

	// Detect current theme and return appropriate colors
	function getThemeColors() {
		const isDark = document.documentElement.classList.contains('dark');
		return {
			tickColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
			legendColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
			gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
		};
	}

	// Re-render chart when data changes
	$effect(() => {
		if (chart && data) {
			chart.data.labels = data.map((d) => d.month ?? '');
			chart.data.datasets[0].data = data.map((d) => d.income);
			chart.data.datasets[1].data = data.map((d) => d.expenses);
			chart.update();
		}
	});

	onMount(() => {
		if (!canvasElement) return;
		const ctx = canvasElement.getContext('2d');
		if (!ctx) return;

		const { tickColor, legendColor, gridColor } = getThemeColors();

		// 3D-style cylinder gradients
		const incomeGrad = ctx.createLinearGradient(0, 0, 0, 300);
		incomeGrad.addColorStop(0, 'rgba(52, 211, 153, 0.9)');
		incomeGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.7)');
		incomeGrad.addColorStop(1, 'rgba(4, 120, 87, 0.4)');

		const expenseGrad = ctx.createLinearGradient(0, 0, 0, 300);
		expenseGrad.addColorStop(0, 'rgba(248, 113, 113, 0.9)');
		expenseGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.7)');
		expenseGrad.addColorStop(1, 'rgba(185, 28, 28, 0.4)');

		chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.month ?? ''),
				datasets: [
					{
						label: 'Income',
						data: data.map((d) => d.income),
						backgroundColor: incomeGrad,
						borderColor: 'rgba(52, 211, 153, 0.4)',
						borderWidth: 1,
						borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 0, bottomRight: 0 },
						borderSkipped: false,
						barPercentage: 0.7,
						categoryPercentage: 0.6
					},
					{
						label: 'Expenses',
						data: data.map((d) => d.expenses),
						backgroundColor: expenseGrad,
						borderColor: 'rgba(248, 113, 113, 0.4)',
						borderWidth: 1,
						borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 0, bottomRight: 0 },
						borderSkipped: false,
						barPercentage: 0.7,
						categoryPercentage: 0.6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: legendColor,
							font: { family: 'Outfit, sans-serif', size: 12, weight: 500 },
							usePointStyle: true,
							pointStyle: 'circle',
							padding: 20
						}
					},
					tooltip: {
						backgroundColor: 'rgba(15, 23, 42, 0.9)',
						titleColor: '#fff',
						bodyColor: 'rgba(255,255,255,0.85)',
						titleFont: { family: 'Outfit, sans-serif', size: 13, weight: 'bold' },
						bodyFont: { family: 'Outfit, sans-serif', size: 12 },
						borderColor: 'rgba(255, 255, 255, 0.15)',
						borderWidth: 1,
						padding: 12,
						cornerRadius: 12,
						displayColors: true,
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
							font: { family: 'Outfit, sans-serif', size: 11 }
						}
					},
					y: {
						grid: {
							color: gridColor
						},
						ticks: {
							color: tickColor,
							font: { family: 'Outfit, sans-serif', size: 11 },
							callback: function (value) {
								if (typeof value === 'number') {
									if (value >= 1000000) return fmt(value / 1000000) + 'M';
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

		// Watch for theme changes (e.g. user switches in Settings)
		const observer = new MutationObserver(() => {
			if (!chart) return;
			const { tickColor: tc, legendColor: lc, gridColor: gc } = getThemeColors();
			const opts = chart.options as any;
			opts.plugins.legend.labels.color = lc;
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

<div class="relative w-full h-full min-h-[220px]">
	<!-- 3D depth background layer -->
	<div class="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-2xl pointer-events-none"></div>
	<canvas bind:this={canvasElement}></canvas>
</div>
