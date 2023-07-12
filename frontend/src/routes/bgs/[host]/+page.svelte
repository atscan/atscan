<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import BasicChart from '$lib/components/BasicChart.svelte';
	import { writable } from 'svelte/store';

	export let data;

	const tabState = writable(0);

	function activityMapSeries(data, types) {
		return types.map((key) => {
			let [mod, type] = key.split(':');
			return {
				name: `${type.replace(/^app.bsky./, '')} (${mod})`,
				type: 'line',
				data:
					data
						.filter((i) => i.mod === mod && i.type === type)
						.map((r) => r._value)
						.slice(1, -1) || [],
				lineStyle: {
					normal: {
						width: 1
					}
				},
				stack: 'x',
				areaStyle: {
					opacity: 0.5
				},
				smooth: false
			};
		});
	}
</script>

<BasicPage {data} title={data.item.host} breadcrumb={[{ label: 'BGS Instances', link: '/bgs' }]}>
	<BasicChart
		title="Activity"
		endpoint="/bgs/{data.item.host}/ops"
		chartType="complex"
		processSeries={activityMapSeries}
		{tabState}
	/>

	<BasicChart
		title="Post latency"
		endpoint="/bgs/{data.item.host}/postLatency"
		unit="ms"
		height="h-[20vh]"
		{tabState}
	/>

	<SourceSection {data} model="bgs" hide="true" />

	<div class="min-h-screen" />
</BasicPage>
