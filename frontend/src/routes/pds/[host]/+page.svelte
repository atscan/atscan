<script>
    import Breadcrumb from '$lib/components/Breadcrumb.svelte';
    import DIDTable from '$lib/components/DIDTable.svelte';
    import { formatNumber, dateDistance, getFlagEmoji } from '$lib/utils.js';
    import SourceSection from '$lib/components/SourceSection.svelte';
    
    export let data;

    const item = data.item;

    const infoMaps = []
    infoMaps.push({
        items: [
            { title: 'PLCs used', value: item.plcs.map(p => {
                    const host = p.replace(/^https?:\/\//, '')
                    return `<a href="/plc/${host}" class="underline hover:no-underline">${host}</a>`
                }).join(', ')},
            { title: 'User domains', value: item.inspect?.current?.data?.availableUserDomains?.join(', ') || 'n/a' },
            { title: 'DID count', value: `${formatNumber(item.didsCount)} (<a href="/did?q=pds:${item.host}" class="underline hover:no-underline">list</a>)` },
            { title: 'Response time', value: item.inspect?.current?.ms ? item.inspect?.current?.ms+'ms (from Central Europe)' : `Error: ${item.inspect?.current?.err}` },
            { title: 'Last contact', value: `${dateDistance(item.inspect?.current?.time)} ago (${item.inspect?.current?.time})` },
        ]
    })
    infoMaps.push({
        title: `<span class="text-2xl">${getFlagEmoji(item.ip.country)}</span> <a href="http://ipinfo.io/${item.ip.ip}" target="_blank" class="underline hover:no-underline">${item.ip.ip}</a>`,
        items: [
            { title: 'Host', value: `${item.ip.hostname}` },
            { title: 'Location', value: `${item.ip.country} - ${item.ip.city}, ${item.ip.region} (<a href="https://www.google.com/maps?q=${item.ip.loc}" target="_blank" class="underline hover:no-underline">${item.ip.loc})</a>` },
            //{ title: 'Coordinates', value: item.ip.loc },
            { title: 'AS / Organization', value: item.ip.org },
            //{ title: 'Postal code', value: item.ip.postal },
            { title: 'Timezone', value: item.ip.timezone },
        ]
    })
</script>

<svelte:head>
	<title>{item.host} [PDS] | ATScan</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
    <Breadcrumb data={[
        { label: 'PDS Instances', link: '/pds' },
        { label: `<span class="mr-2 badge ${item.env === 'bsky' ? 'bg-ats-bsky' : (item.env === 'sandbox' ? 'bg-ats-sbox' : 'bg-gray-500')} text-white dark:text-black">${item.env}</span> federation`, link: `/pds?federation=${item.env}` }
    ]} />
	<h1 class="h1">
        {item.host}
    </h1>
    <div class="lg:grid grid-cols-2 gap-4">
        {#each infoMaps as map}
            <div class="card p-4 lg:mb-0 mb-2">
                {#if map.title}
                    <h3 class="h4 uppercase mb-2">{@html map.title}</h3>
                {/if}
                <div class="">
                    {#each map.items as i}
                        <div class="flex gap-2 w-full mb-1"><div class="font-semibold">{i.title}</div><div class="">{@html i.value}</div></div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>


    <h2 class="h2"><a href="/did?q=pds:{item.host}">DIDs</a> <span class="font-normal text-2xl">({formatNumber(data.dids.count)})</span></h2>
    <DIDTable sourceData={data.dids.items} {data} />
    {#if data.dids.count > data.dids.items.length}
        <div><a href="/did?q=pds:{item.host}"><button class="btn variant-filled">Show all {formatNumber(data.dids.count)} DIDs hosted by {item.host}</button></a></div>
    {/if}

    <SourceSection {data} model="pds" />
</div>