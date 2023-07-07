<script>
	import { dateDistance, formatNumber } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import PDSTable from '$lib/components/PDSTable.svelte';
	import PDSMap from '$lib/components/PDSMap.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import { orderBy } from 'lodash';
	import { nats, connected, codec } from '$lib/sockets.js';
	import { preferences } from '$lib/stores.js';
	import { onMount, onDestroy } from 'svelte';

	export let data;

	const subscriptions = [];

	const search = writable($page.url.searchParams.get('q') || '');
	let sort = data.sort || null;

	let baseData = data.pds;
	let sortedData = sortData(baseData);
	let sourceData = filterSourceData(sortedData);
	let favoritesData = baseData.filter((i) => $preferences.favoritePDS.includes(i.host)) || [];

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
		updateData();
		return val;
	});

	function selectionHandler(i) {
		return goto(`/pds/${i.detail[0]}`);
	}

	function updateData(base = null) {
		if (!base) {
			base = baseData;
		}
		base = base.map((i) => {
			i._isFavorite = $preferences.favoritePDS.includes(i.host);
			return i;
		});
		sortedData = sortData(base);
		sourceData = filterSourceData(sortedData);
		favoritesData = baseData.filter((i) => $preferences.favoritePDS.includes(i.host)) || [];
	}

	function filterSourceData(bd) {
		const tokens = $search.split(' ');
		let base = bd; //.filter(d => d.inspect?.lastOnline)
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

		return base;
		//return sortData(base);
	}

	function sortData(base) {
		if (sort) {
			let sortReal = sort;
			let sortDirection = 1;
			let sortKey = sortReal.replace(/^!/, '');
			if (sortReal.startsWith('!')) {
				sortDirection = -1;
			}
			base = orderBy(base, [sortKey], [sortDirection === -1 ? 'desc' : 'asc']);
		} else {
			base = base.map((x) => {
				x.statusSort =
					x.status === 'online' ? 0 : x.status === 'degraded' ? 0 : x.status === 'offline' ? 2 : 3;
				return x;
			});
			base = orderBy(base, ['env', 'statusSort', 'didsCount'], ['asc', 'asc', 'desc']);
		}
		return base;
	}

	function formSubmit() {
		const url = '?q=' + $search;
		goto(url);
		return false;
	}

	function onHeadSelected(e) {
		sort = sort === e.detail ? (sort.startsWith('!') ? '' : '!') + e.detail : e.detail;
		gotoNewTableState();
		updateData();
	}

	function onFavoriteClick(e) {
		let favs = $preferences.favoritePDS;
		if (favs.includes(e.detail)) {
			favs.splice(favs.indexOf(e.detail), 1);
		} else {
			favs.push(e.detail);
		}
		preferences.set(Object.assign($preferences, { favoritePDS: favs }));
		updateData();
	}

	function subscribePDS() {
		const sub = nats.subscribe('ats.api.pds.*');
		subscriptions.push(sub);
		(async () => {
			for await (const m of sub) {
				//console.log(`[${sub.getProcessed()}x]: ${JSON.stringify(m.data)}`);
				switch (m.subject) {
					case 'ats.api.pds.update':
						const pds = codec.decode(m.data);
						pds._isChange = 'update';
						const exist = baseData.find((i) => i.url === pds.url);
						if (exist) {
							const index = baseData.indexOf(exist);
							baseData[index] = pds;
							updateData(baseData);

							//console.log(pds._isChange);
							setTimeout(() => {
								updateData(
									baseData.map((sd) => {
										if (sd.url === pds.url) {
											pds._isChange = false;
										}
										return sd;
									})
								);
							}, 250);
						}
						break;
				}
			}
			console.log('subscription closed');
		})();
	}

	connected.subscribe((val) => {
		if (val === true) {
			subscribePDS();
		}
	});

	onDestroy(() => {
		for (const sub of subscriptions) {
			sub.unsubscribe();
		}
	});
</script>

<BasicPage {data} title="PDS Instances">
	{#if $preferences.favoritePDS.length > 0}
		<h2 class="h2">Your favourites</h2>
		<PDSTable sourceData={favoritesData} {data} on:favoriteClick={(e) => onFavoriteClick(e)} />

		<h2 class="h2">All instances</h2>
	{/if}

	<PDSMap data={baseData} />

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
	<div class="min-h-screen">
		<PDSTable
			{sourceData}
			{data}
			sorting="true"
			on:headSelected={(e) => onHeadSelected(e)}
			on:favoriteClick={(e) => onFavoriteClick(e)}
		/>
	</div>
</BasicPage>
