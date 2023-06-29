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
		if (key === 'name') {
			val = `<span class="text-xl font-semibold">${val}</span>`;
		}
		if (key === 'dids') {
			const host = row.plc.replace(/^https?:\/\//, '');
			const plc = data.plc?.find((p) => p.host === host) || { didsCount: 0 };
			val = `<a href="/dids?q=plc:${host}" class="anchor">${formatNumber(plc.didsCount)}</a>`;
		}
		if (key === 'plc') {
			const host = row.plc.replace(/^https?:\/\//, '');
			val = `<a href="/dids?q=plc:${host}" class="anchor">${host}</a>`;
		}
		if (key === 'lastUpdate') {
			const host = row.plc.replace(/^https?:\/\//, '');
			const plc = data.plc?.find((p) => p.host === host);
			val = plc ? `<span class="text-xs">${dateDistance(plc.lastUpdate)} ago</a>` : '-';
		}
		if (key === 'url_raw') {
			val = `/fed/${row.id}`;
		}
		return val;
	}

	const sourceData = data.ecosystem.data.federations;
	const tableSimple = {
		// A list of heading labels.
		head: ['Federation', 'Name', 'DIDs', 'PLC Directory', 'PLC Last mod'],
		body: customTableMapper(sourceData, ['world', 'name', 'dids', 'plc', 'lastUpdate'], tableMap),
		meta: customTableMapper(sourceData, ['id', 'url_raw'], tableMap)
	};
</script>

<BasicPage {data} title="Federations">
	<Table source={tableSimple} />
</BasicPage>
