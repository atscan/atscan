<script>
    import { CodeBlock } from '@skeletonlabs/skeleton';
    import Breadcrumb from '$lib/components/Breadcrumb.svelte';
    import { dateDistance, identicon } from '$lib/utils.js';
    import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';

    export let data;

    const item = data.item;
    const handles = item.revs[item.revs.length-1].operation.alsoKnownAs.map(h => h.replace(/^at:\/\//, ''))

    function tableMapperValuesLocal (source, keys) {
        let i = 0
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
                if (key === 'num') {
                    val = String('#'+i)
                }
                if (key === 'handle') {
                    val = row.operation.alsoKnownAs.map(a => a.replace(/^at:\/\//,'@')).join(', ')
                }
                if (key === 'createdAt') {
                    val = `<span title="${val}" alt="${val}">${dateDistance(val)}</span>`
                }
                return mappedRow[key] = val
		    })
            i++
		    return mappedRow;
        }).reverse())
    }

    const sourceData = item.revs
    const historyTable = {
		head: [ '#', 'Handle', 'CID', 'Age' ],
		body: tableMapperValuesLocal(sourceData, ['num', 'handle', 'cid', 'createdAt']),
		meta: tableMapperValues(sourceData, ['cid']),
	};
</script>

<svelte:head>
	<title>{item.did} | ATScan</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
    <Breadcrumb data={[
        { label: 'DIDs', link: '/did' },
        { label: `<span class="mr-2 badge ${item.env ? 'bg-ats-'+item.env : 'bg-gray-500'} text-white dark:text-black">${item.env}</span> federation`, link: `/did?federation=${item.env}` }
    ]} />
    <div class="flex gap-8">
        <div>
           <img src={identicon(item.did)} class="w-40 h-40 rounded-2xl bg-gray-200 dark:bg-gray-800 float-left" alt={item.did} />
        </div>
        <div class="grow">
            <h1 class="h1">
                <span class="opacity-50 font-normal">did:plc:</span><span class="font-semibold opacity-100">{item.did.replace(/^did:plc:/, '')}</span>
            </h1>
            <div class="text-2xl mt-4">
                {@html handles.map(h => `<a href="https://bsky.app/profile/${h}" target="_blank" class="hover:underline">@${h}</a>`).join(', ')}
            </div>
        </div>
    </div>

    <h2 class="h2">Revisions <span class="font-normal text-2xl">({sourceData.length})</span></h2>
    <Table source={historyTable} />

    <h2 class="h2">Source</h2>
    <CodeBlock code={JSON.stringify(item, null, 2)} language="json" />

	<!--p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p-->
</div>