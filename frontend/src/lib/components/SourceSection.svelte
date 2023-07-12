<script>
	import { CodeBlock, clipboard } from '@skeletonlabs/skeleton';

	export let data;
	export let model = 'pds';
	export let hide = false;

	const models = {
		pds: { url: `${data.config.api}/pds/%`, key: 'host' },
		did: { url: `${data.config.api}/%`, key: 'did' },
		client: { url: `${data.config.api}/client/%`, key: 'id' },
		fed: { url: `${data.config.api}/fed/%`, key: 'id' },
		bgs: { url: `${data.config.api}/bgs/%`, key: 'host' },
		plc: { url: `${data.config.api}/plc/%`, key: 'host' }
	};
	const config = models[model];
	const url = config.url.replace('%', data.item[config.key]);
</script>

<h2 class="h2">Source</h2>
{#if !hide}
	<CodeBlock code={JSON.stringify(data.item, null, 2)} language="json" />
{/if}

<div>
	<p>You can get this data as JSON by making a simple HTTP GET request to our API endpoint:</p>
	<div class="mt-4 mb-8 flex gap-4 w-full">
		<div data-clipboard="exampleElement" class="textarea p-2 break-all">{url}</div>
		<button use:clipboard={{ element: 'exampleElement' }} class="btn btn-sm variant-filled"
			><i class="fa-regular fa-clipboard mr-2" /> Copy</button
		>
		<a href={url} class="btn btn-sm variant-filled" target="_blank"
			>Open <i class="ml-2 fa-solid fa-arrow-right" /></a
		>
	</div>
	<!--p>Example:</p>
    <CodeBlock code={url} class="mt-4" /-->
</div>
