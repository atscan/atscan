<script>
	import { dataTableHandler, tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import PDSTable from '$lib/components/PDSTable.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const search = writable($page.url.searchParams.get('q') || '');

	function gotoNewTableState() {
		const path = '/pds' + ($search !== '' ? `?q=${$search}` : '');
		const currentPath = $page.url.pathname + $page.url.search;
		if (currentPath === path) {
			return null;
		}
		goto(path, { keepFocus: true, noScroll: true });
	}

	search.subscribe((val) => {
		gotoNewTableState();
		return val;
	});

	function selectionHandler(i) {
		return goto(`/pds/${i.detail[0]}`);
	}

	$: sourceData = (function filterSourceData(bd) {
		const tokens = $search.split(' ');
		let base = JSON.parse(JSON.stringify(bd)); //.filter(d => d.inspect?.lastOnline)
		let str = [];
		for (const t of tokens) {
			const cmatch = t.match(/^country:([\w]{2})$/);
			if (cmatch) {
				console.log(cmatch[1]);
				base = base.filter((b) => {
					if (!b.ip) {
						return false;
					}
					return b.ip.country.toLowerCase() === cmatch[1].toLowerCase();
				});
			} else {
				str.push(t);
			}
		}
		const txt = str.join(' ').trim();
		if (txt) {
			base = base.filter((i) => i.url.match(new RegExp(txt, 'i')));
		}
		return base;
	})(data.pds);

	function formSubmit() {
		const url = '?q=' + $search;
		goto(url);
		return false;
	}
</script>

<BasicPage {data} title="PDS Instances">
	<form on:submit|preventDefault={formSubmit} class="flex gap-4">
		<input
			class="input"
			title="Input (text)"
			type="text"
			placeholder="Search for PDS .."
			bind:value={$search}
		/>
		<!--button type="submit" class="btn variant-filled">Search</button-->
	</form>

	<div class="text-xl">
		{#if $search && $search?.trim() !== ''}
			Search for <code class="code text-2xl variant-tertiary">{$search.trim()}</code>
			({formatNumber(sourceData.length)}):
		{:else}
			All PDS Instances ({formatNumber(sourceData.length)}):
		{/if}
	</div>
	<PDSTable {sourceData} {data} />
</BasicPage>
