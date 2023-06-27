<script>
    import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
    import { dateDistance, formatNumber } from '$lib/utils.js';

    export let data;

    function tableMapperValuesLocal (source, keys) {
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
                if (key === 'world') {
					val = `<span class="badge variant-filled ${row.color} dark:${row.color} opacity-70 text-white dark:text-black">${row.name}</span>`
                }
                if (key === 'host') {
                    val = `<span class="text-xl font-semibold">${val}</span>`
                }
                if (key === 'code') {
                    val = `<div class="inline-block font-mono">${val}</div>`
                }
                if (key === 'lastUpdate') {
                    val = dateDistance(val)
                }
                if (key === 'didsCount') {
                    val = `<a href="/did?plc=${row.host}" class="hover:underline">${formatNumber(val)}</a>`
                }
                return mappedRow[key] = val
		    })
		    return mappedRow;
        }))
    }

    const sourceData = data.plc;
    const tableSimple = {
		// A list of heading labels.
		head: ['Federation', 'Host', 'DIDs', 'Last mod'],
		body: tableMapperValuesLocal(sourceData, ['world', 'host', 'didsCount', 'lastUpdate']),
		meta: tableMapperValues(sourceData, ['position', 'name', 'symbol', 'weight']),
	};

</script>

<svelte:head>
	<title>PLC Directories | ATScan</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">PLC Directories ({sourceData.length})</h1>
	<Table source={tableSimple} interactive={true} />
</div>