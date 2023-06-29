<script>
	import Breadcrumb from './Breadcrumb.svelte';

	export let title;
	export let breadcrumb;
	export let data;
	export let noHeader = false;
</script>

<svelte:head>
	<title>{title} | {data.config.name}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 md:p-6 md:space-y-6">
	{#if breadcrumb}
		<Breadcrumb data={breadcrumb} />
	{/if}

	{#if title && !noHeader}
		<h1 class="h1">{title}</h1>
	{/if}

	<slot />
</div>
