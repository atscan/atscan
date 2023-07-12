<script>
	import {
		TabGroup,
		Tab,
		TabAnchor,
		ProgressRadial,
		SlideToggle,
		dataTableHandler
	} from '@skeletonlabs/skeleton';
	import Chart from '$lib/components/Chart.svelte';
	import { formatNumber } from '$lib/utils';
	import { writable } from 'svelte/store';
	import { request } from '$lib/api';
	import { onDestroy } from 'svelte';

	export let title;
	export let endpoint;
	export let height = 'h-[40vh]';
	export let processSeries = (data) =>
		data ? [{ name: title, type: 'line', data: data.map((r) => r._value) }] : [];
	export let unit = 'op/s';
	export let valueFormatter = (val) => `${val !== undefined ? formatNumber(val) : '-'} ${unit}`;
	export let axisDataProcess = (data) =>
		data
			.filter((r) => r.table === 0)
			.map((r) => r._time)
			.slice(1, -1) || [];
	export let ranges = ['1h', '24h', '7d', '30d'];
	export let chartType = null;
	export let tabState = writable(0);

	const chartActivityTab = tabState;
	let chartActivity = null;

	function renderActivityChart(chartData) {
		let types = [];
		let typesCount = {};
		if (chartType === 'complex') {
			for (const ci of chartData) {
				const key = `${ci.mod}:${ci.type}`;
				if (!types.includes(key)) {
					types.push(key);
				}
				if (!typesCount[key]) {
					typesCount[key] = 0;
				}
				typesCount[key] += ci._value;
			}
		}
		types = types.sort((x, y) => (typesCount[x] < typesCount[y] ? 1 : -1));

		return {
			animationDuration: 250,
			tooltip: {
				trigger: 'axis',
				valueFormatter
				/*position: function (point, params, dom, rect, size) {
                    // fixed at top
                    return [point[0] + 50, point[1] + 50];
                },*/
			},
			/*legend: {
				data: types.map((c) => {
                    let [ mod, type ] = c.split(':')
                    return `${type.replace(/^app.bsky./, '')} (${mod})`
                })
			},*/
			grid: {
				left: '2%',
				right: '2%',
				bottom: '3%',
				top: '10%',
				containLabel: true
			},
			toolbox: {
				feature: {
					magicType: { show: true, type: ['stack', 'tiled'] },
					saveAsImage: {}
				}
			},
			xAxis: {
				type: 'category',
				//boundaryGap: false,
				data: axisDataProcess(chartData)
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: `{value} ${unit}`
				}
			},
			series: processSeries(chartData, types)
			/*||chartType === 'complex' ? 
                types.map()
            : [{
                name: item.host,
                type: 'line',
                data: chartData.map((r) => r._value) || []
			}]*/
		};
	}

	let chartInterval = null;

	chartActivityTab.subscribe(async (num) => {
		if (!endpoint) {
			return null;
		}

		chartActivity = null;
		if (chartInterval) {
			clearInterval(chartInterval);
		}
		async function render() {
			const data = await request(
				fetch,
				`${endpoint}?range=${ranges[num]}&complex=${chartType === 'complex' ? 1 : ''}`
			);
			if (data) {
				chartActivity = renderActivityChart(data.data);
			}
		}
		render();
		chartInterval = setInterval(() => {
			render();
		}, 15 * 1000);
	});

	onDestroy(() => {
		if (chartInterval) {
			clearInterval(chartInterval);
		}
	});
</script>

<h2 class="h2">{title}</h2>

<TabGroup>
	<Tab bind:group={$chartActivityTab} name="tab1" value={0}>Last 1h</Tab>
	<Tab bind:group={$chartActivityTab} name="tab2" value={1}>Last 24h</Tab>
	<Tab bind:group={$chartActivityTab} name="tab3" value={2}>Last 7d</Tab>
	<Tab bind:group={$chartActivityTab} name="tab4" value={3}>Last 30d</Tab>
	<!-- Tab Panels --->
	<svelte:fragment slot="panel">
		<div class="w-full {height}">
			{#if chartActivity}
				<Chart options={chartActivity} />
			{:else}
				<div class="flex items-center justify-center w-full h-full">
					<div>
						<ProgressRadial />
					</div>
				</div>
			{/if}
		</div>
	</svelte:fragment>
</TabGroup>
