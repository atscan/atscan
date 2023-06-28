<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SourceSection from '$lib/components/SourceSection.svelte';

	export let data;

	const item = data.item;
</script>

<svelte:head>
	<title>{item.name} | {data.config.name}</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
	<Breadcrumb data={[{ label: 'Clients', link: '/clients' }]} />

	<h1 class="h1">{item.name}</h1>

	<SourceSection {data} model="client" />
</div>
