<script>
	import { dataTableHandler, tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import PDSTable from '$lib/components/PDSTable.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import { orderBy } from 'lodash';
	import { compute_slots } from 'svelte/internal';

	export let data;

	const search = writable($page.url.searchParams.get('q') || '');
	let sort = data.sort || null;

	function gotoNewTableState() {
		let args = [];
		if ($search !== '') {
			args.push(`q=${$search}`);
		}
		if (sort) {
			args.push(`sort=${sort}`);
		}
		const path = '/pds' + (args.length > 0 ? '?' + args.join('&') : '');
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
		base = base.map((i) => {
			i.country = i.ip?.country;
			//i.ms = !i.inspect?.current.err ? i.inspect?.current?.ms : null;
			i.lastOnline = i.inspect?.lastOnline;
			return i;
		});
		let str = [];
		for (const t of tokens) {
			const cmatch = t.match(/^country:([\w]{2})$/);
			const fmatch = t.match(/^fed:(\w+)$/);
			if (cmatch) {
				//console.log(cmatch[1]);
				base = base.filter((b) => {
					if (!b.ip) {
						return false;
					}
					return b.ip.country.toLowerCase() === cmatch[1].toLowerCase();
				});
			} else if (fmatch) {
				base = base.filter((b) => b.fed?.toLowerCase() === fmatch[1].toLowerCase());
			} else {
				str.push(t);
			}
		}
		const txt = str.join(' ').trim();
		if (txt) {
			base = base.filter((i) => i.url.match(new RegExp(txt, 'i')));
		}
		if (sort) {
			let sortReal = sort;
			let sortDirection = 1;
			let sortKey = sortReal.replace(/^!/, '');
			if (sortReal.startsWith('!')) {
				sortDirection = -1;
			}
			base = orderBy(base, [sortKey], [sortDirection === -1 ? 'desc' : 'asc']);
		} else {
			console.log('x');
			base = orderBy(base, ['env', 'err', 'didsCount'], ['asc', 'asc', 'desc']);
		}

		return base;
	})(data.pds);

	function formSubmit() {
		const url = '?q=' + $search;
		goto(url);
		return false;
	}

	function onHeadSelected(e) {
		sort = sort === e.detail ? (sort.startsWith('!') ? '' : '!') + e.detail : e.detail;
		gotoNewTableState();
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
	<PDSTable {sourceData} {data} on:headSelected={(e) => onHeadSelected(e)} />
</BasicPage>
