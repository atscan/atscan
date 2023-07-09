<script>
	import BasicPage from '$lib/components/BasicPage.svelte';
	import UserList from '$lib/components/UserList.svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import { ProgressRadial, SlideToggle } from '@skeletonlabs/skeleton';
	import { formatNumber } from '$lib/utils';
	import { beforeUpdate, afterUpdate } from 'svelte';

	export let data;

	$: totalCount = data.totalCount;
	$: sourceData = data.items;
	let search = writable(data.q || '');
	$: mysearch = $search;
	let sort = data.sort || null;

	function formSubmit() {}

	search.subscribe((val) => {
		if (val?.trim() === data.q) {
			return val;
		}
		//sourceData = null;
		totalCount = null;
		//onsole.log('xx')
		gotoNewTableState();
		return val;
	});

	function gotoNewTableState() {
		let q = $search || '';
		q = q.trim();
		let args = [];
		if (q) {
			args.push(`q=${q}`);
		}
		/*if (sort && !(args.length === 0 && sort === '!size')) {
			args.push(`sort=${sort}`);
		}*/

		const path = '/users' + (args.length > 0 ? '?' + args.join('&') : '');
		const currentPath = $page.url.pathname + $page.url.search;
		console.log(currentPath, path);
		if (currentPath === path) {
			return null;
		}
		goto(path, { keepFocus: true, noScroll: true });
	}
</script>

<BasicPage {data} title="Users">
	<form on:submit|preventDefault={formSubmit} class="flex gap-4">
		<div class="flex w-full gap-4 items-center justify-center">
			<div class="grow">
				<input
					class="input"
					title="Input (text)"
					type="text"
					placeholder="Search for user .."
					bind:value={$search}
					autocomplete="off"
					spellcheck="false"
					autocorrect="off"
				/>
			</div>
		</div>
		<!--button type="submit" class="btn variant-filled">Search</button-->
	</form>

	<div class="min-h-screen">
		<div class="text-xl mb-4">
			{#if $search && $search?.trim() !== ''}
				Search for <code class="code text-xl variant-tertiary">{$search.trim()}</code>
				{#if totalCount !== null}({formatNumber(totalCount)}){/if}:
			{:else}
				All Users {#if totalCount !== null}({formatNumber(totalCount)}){/if}:
			{/if}
		</div>
		{#if sourceData === null}
			<!--div class="flex justify-center items-center w-full h-full">
				<ProgressRadial />
			</div!-->
		{:else}
			<UserList {data} items={sourceData} />
		{/if}
	</div>
</BasicPage>
