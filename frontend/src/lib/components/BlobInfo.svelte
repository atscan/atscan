<script>
	import { filesize } from '$lib/utils';

	export let data;
</script>

<div class="ml-4 mt-2 text-sm">
	{#if data}
		Size: {filesize(data.size)}<br />
		Format: {data.mime}
		{#if data.image}({data.image.width}x{data.image.height}px){/if}
	{:else}
		<span class="opacity-50 animate-pulse">Loading info about blob ..</span>
	{/if}
</div>
