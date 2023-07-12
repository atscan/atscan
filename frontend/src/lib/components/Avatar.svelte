<script>
	import { onMount, beforeUpdate, afterUpdate } from 'svelte';
	export let src;

	let loaded = false;
	let failed = false;
	let loading = false;
	let last = src;

	let img;

	beforeUpdate(() => {
		if (src !== last) {
			img.src = src;
			last = src;
			loading = true;
			loaded = false;
			console.log('loading again');
		}
	});

	function processImage() {
		img = new Image();
		img.src = src;
		loading = true;

		img.onload = () => {
			loading = false;
			console.log('loaded');
			loaded = true;
		};
		img.onerror = () => {
			loading = false;
			failed = true;
		};
	}

	onMount(() => {
		processImage();
	});
</script>

{#if loaded}
	<img {src} class="ratio-square w-full h-full rounded-full object-contains" />
{:else if loading}
	<div class="bg-white/20 w-full h-full rounded-full" />
{/if}
