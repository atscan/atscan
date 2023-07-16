<script>
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import { onMount, beforeUpdate, afterUpdate, createEventDispatcher } from 'svelte';

	export let src;
	export let divClass = '';
	export let imgClass = '';

	const dispatch = createEventDispatcher();

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
			loaded = true;

			dispatch('load', {});
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

<div class={divClass}>
	{#if loaded}
		<img {src} class="w-full h-full {imgClass}" alt="image" />
	{:else if loading}
		<div class="w-full h-full p-8">
			<ProgressBar />
		</div>
	{/if}
</div>
