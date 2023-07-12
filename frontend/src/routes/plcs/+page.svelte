<script>
	import Table from '$lib/components/Table.svelte';
	import { dataTableHandler, tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber, customTableMapper } from '$lib/utils.js';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	function tableMap({ val, key, row }) {
		console.log({ key, val });
		if (key === 'world') {
			val = `<span class="badge variant-filled bg-ats-fed-${row.federation} dark:bg-ats-fed-${row.federation} opacity-70 text-white dark:text-black ucfirst">${row.federation}</span>`;
		}
		if (key === 'host') {
			val = `<span class="text-xl font-semibold">${val}</span>`;
		}
		if (key === 'didsCount') {
			val = `<a href="/dids?q=fed:${row.federation}" class="anchor">${formatNumber(val)}</a>`;
		}
		if (key === 'pdsCount') {
			val = `<a href="/pds?q=fed:${row.federation}" class="anchor">${
				row.host === 'plc.directory' ? 1 : formatNumber(val)
			}</a>`;
			if (row.host === 'plc.directory') {
				val += ` <div class="text-xs inline-block ml-2">(+${formatNumber(row.pdsCount)})</div>`;
			}
		}
		if (key === 'time') {
			val = row.lastUpdate ? `<span class="text-xs">${dateDistance(row.lastUpdate)} ago</a>` : '-';
		}
		if (key === 'url_raw') {
			val = `/plc/${row.host}`;
		}
		return val;
	}

	const sourceData = data.plcs.sort((x, y) => (x.didsCount > y.didsCount ? -1 : 1));
	const tableSimple = {
		// A list of heading labels.
		head: ['Federation', 'Host', 'DIDs', 'PDS', 'Last mod'],
		body: customTableMapper(
			sourceData,
			['world', 'host', 'didsCount', 'pdsCount', 'time'],
			tableMap
		),
		meta: customTableMapper(sourceData, ['id', 'url_raw'], tableMap)
	};
</script>

<BasicPage {data} title="PLC Directories">
	<Table source={tableSimple} />
</BasicPage>
