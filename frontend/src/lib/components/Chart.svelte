<script lang="ts" context="module">
	import { createEventDispatcher } from 'svelte';
	import * as echarts from 'echarts';
	import '$lib/world';

	// console.log(echarts.registerMap())

	export { echarts };

	import * as world from '../world.json';

	echarts.registerMap('world', world);

	import * as darkTheme from '../theme-dark.json';
	import * as lightTheme from '../theme-light.json';

	export type EChartsOptions = echarts.EChartsOption;
	export type EChartsTheme = string | object;
	export type EChartsRenderer = 'canvas' | 'svg';

	echarts.registerTheme('darkTheme', JSON.parse(JSON.stringify(darkTheme)));
	echarts.registerTheme('lightTheme', JSON.parse(JSON.stringify(lightTheme)));

	export type ChartOptions = {
		theme?: EChartsTheme;
		renderer?: EChartsRenderer;
		options: EChartsOptions;
		dispatch: any;
	};

	const DEFAULT_OPTIONS: Partial<ChartOptions> = {
		theme: 'lightTheme',
		renderer: 'canvas'
	};

	export function chartable(element: HTMLElement, echartOptions: ChartOptions) {
		const { theme, renderer, options, dispatch } = {
			...DEFAULT_OPTIONS,
			...echartOptions
		};
		const elemHtmlClasses = document.documentElement.classList;
		const echartsInstance = echarts.init(
			element,
			elemHtmlClasses.contains('dark') ? 'darkTheme' : 'lightTheme',
			{ renderer }
		);
		echartsInstance.setOption(options);

		function handleResize() {
			echartsInstance.resize();
		}

		echartsInstance.on('click', (params) => {
			dispatch('mapClick', params);
		});

		window.addEventListener('resize', handleResize);

		return {
			destroy() {
				echartsInstance.dispose();
				window.removeEventListener('resize', handleResize);
			},
			update(newOptions: ChartOptions) {
				echartsInstance.setOption({
					...echartOptions.options,
					...newOptions.options
				});
			}
		};
	}
</script>

<script lang="ts">
	export let options: echarts.EChartsOption;
	export let { theme, renderer } = DEFAULT_OPTIONS;
	const dispatch = createEventDispatcher();
</script>

<div class="chart" use:chartable={{ renderer, theme, options, dispatch }} />

<style>
	.chart {
		height: 100%;
		width: 100%;
	}
</style>
