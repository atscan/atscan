<script>
	import { blobUrl } from '$lib/utils';
	import Avatar from '$lib/components/Avatar.svelte';

	export let items;
	export let data;

	let type = null; // = 'grid';
</script>

{#if items}
	<div class="grid grid-cols-1 gap-4">
		{#each items as item}
			{#if type === 'grid'}
				<div>
					<a href="/{item.did}">
						<img
							src={item.repo?.profile?.avatar?.ref?.$link
								? blobUrl(item.did, item.repo?.profile?.avatar?.ref?.$link)
								: '/avatar.svg'}
							class="aspect-square object-cover"
						/>
					</a>
				</div>
			{:else}
				<div class="flex gap-4 bg-surface-500/10 p-4" id={item.did}>
					<div class="w-20 h-20 shrink-0">
						<a href="/{item.did}" class="w-full h-full">
							<Avatar
								id="image-{item.did}"
								src={item.repo?.profile?.avatar?.ref?.$link
									? blobUrl(item.did, item.repo?.profile?.avatar?.ref?.$link)
									: '/avatar.svg'}
							/>
						</a>
					</div>
					<div>
						<div class="text-xl font-semibold">
							<a href="/{item.did}">{item.repo?.profile?.displayName || item.handle}</a>
							{#if item.fed !== 'bluesky'}
								<span
									class="badge variant-filled bg-ats-fed-sandbox dark:bg-ats-fed-sandbox opacity-70 align-[0.3em] ml-2"
									>{item.fed}</span
								>
							{/if}
						</div>
						<div><a href="https://bsky.app/profile/{item.handle}">@{item.handle}</a></div>
						<div class="text-sm mt-2 opacity-70">{item.repo?.profile?.description || ''}</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
