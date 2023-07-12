<script>
	import Table from '$lib/components/Table.svelte';
	import { dataTableHandler, tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber, customTableMapper } from '$lib/utils.js';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	function tableMap({ val, key, row }) {
		if (key === 'world') {
			val = `<span class="badge variant-filled bg-ats-fed-${row.id} dark:bg-ats-fed-${row.id} opacity-70 text-white dark:text-black ucfirst">${row.id}</span>`;
		}
		if (key === 'host') {
			val = `<span class="text-xl font-semibold">${row.url.replace(/^https?:\/\//, '')}</span>`;
		}
		if (key === 'url_raw') {
			val = `/bgs/${row.host}`;
		}
		if (key === 'ops') {
			val = row.status?.ops
				? formatNumber(row.status?.ops, { trimMantissa: true, mantissa: 2 }) + ' op/s'
				: '-';
		}
		return val;
	}

	const sourceData = data.bgs;
	const tableSimple = {
		// A list of heading labels.
		head: ['Federation', 'Host', 'Activity'],
		body: customTableMapper(sourceData, ['world', 'host', 'ops'], tableMap),
		meta: customTableMapper(sourceData, ['id', 'url_raw'], tableMap)
	};
</script>

<BasicPage {data} title="BGS Instances">
	<Table source={tableSimple} />
</BasicPage>
