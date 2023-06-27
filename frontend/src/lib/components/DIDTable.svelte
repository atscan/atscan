<script>
    import Table from '$lib/components/Table.svelte';
    import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
    import { dateDistance, identicon, formatNumber } from '$lib/utils.js';
    export let sourceData;
    export let data;

    function tableMapperValuesLocal (source, keys) {
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
                if (key === 'world') {
                }
                if (key === 'srcHost') {
                    val = `<a href="/did?q=plc:${val}" class="hover:underline">${val}</a>`
                }
                if (key === 'pds') {
                    const host = 
                    val = val.map(i => {
                        const host = i.replace(/^https?:\/\//, '')
                        return `<a href="/pds/${host}" class='hover:underline'>${host}</a>`
                    }).join(', ')
                }
                if (key === 'did') {
                    const did = val
                    const plc = data.plc.find(i => i.url === row.src)
                    val = `<div class="flex gap-6">`
                    val += `    <div>`
                    val += `        <div class="text-lg inline-block"><a href="/${did}" class="hover:underline"><span class="opacity-50">did:plc:</span><span class="font-semibold opacity-100">${did.replace(/^did:plc:/, '')}</span></a></div>`
                    const handles = row.revs[row.revs.length-1].operation.alsoKnownAs.filter(h => !h.match(/at:\/\/data:x\//)).map(h => h.replace(/^at:\/\//, ''))
                    val += `        <div class="mt-1.5">`
                    val += `            <span class="mr-2 badge text-xs variant-filled ${plc.color} dark:${plc.color} opacity-70 text-white dark:text-black">${plc.name}</span>`
                    val += `            <span>${handles.map(h => `<a href="https://bsky.app/profile/${h}" target="_blank" class="hover:underline">@${h}</a>`).join(', ')}</span>`
                    val += `        </div>`
                    val += `    </div>`
                    val += "</div>"
                }
                if (key === 'time') {
                    val = dateDistance(val)
                }
                if (key === 'deep') {
                    val = row.revs.length
                }
                if (key === 'img') {
                    val = `<div class="text-right w-full"><div class="inline-block"><a href="/${row.did}"><img src="${identicon(row.did)}" class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 float-left" /></a></div></div>`
                }

                return mappedRow[key] = val
		    })
		    return mappedRow;
        }))
    }
    $: tableSimple = {
        // A list of heading labels.
        head: ['', 'DID', '#', 'PLC', 'PDS', 'Last mod'],
        body: tableMapperValuesLocal(sourceData || [], ['img', 'did', 'deep', 'srcHost', 'pds', 'time']),
        meta: tableMapperValues(sourceData || [], ['did']),
    };

</script>

<Table source={tableSimple} />