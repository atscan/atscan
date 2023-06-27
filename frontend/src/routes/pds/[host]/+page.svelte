<script>
    import Breadcrumb from '$lib/components/Breadcrumb.svelte';
    import DIDTable from '$lib/components/DIDTable.svelte';
    import { formatNumber } from '$lib/utils.js';
    import SourceSection from '$lib/components/SourceSection.svelte';
    
    export let data;

    const item = data.item;
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


    <h2 class="h2"><a href="/did?q=pds:{item.host}">DIDs</a> <span class="font-normal text-2xl">({formatNumber(data.dids.count)})</span></h2>
    <DIDTable sourceData={data.dids.items} {data} />
    {#if data.dids.count > data.dids.items.length}
        <div><a href="/did?q=pds:{item.host}"><button class="btn variant-filled">Show all {formatNumber(data.dids.count)} DIDs hosted by {item.host}</button></a></div>
    {/if}

    <SourceSection {data} model="pds" />
</div>