<script>
    import { CodeBlock } from '@skeletonlabs/skeleton';
    import Breadcrumb from '$lib/components/Breadcrumb.svelte';
    export let data;

    const item = data.item;
</script>

<div class="container mx-auto p-8 space-y-8">
    <Breadcrumb data={[
        { label: 'PDS Instances', link: '/pds' },
        { label: `<span class="mr-2 badge ${item.env === 'bsky' ? 'bg-ats-bsky' : (item.env === 'sandbox' ? 'bg-ats-sbox' : 'bg-gray-500')} text-white dark:text-black">${item.env}</span> federation`, link: `/pds?federation=${item.env}` }
    ]} />
	<h1 class="h1">
        {item.host}
    </h1>

    <h2 class="h2">Source</h2>
    <CodeBlock code={JSON.stringify(item, null, 2)} language="json" />

	<!--p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p-->
</div>