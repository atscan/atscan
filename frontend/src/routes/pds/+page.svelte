<script>
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber } from '$lib/utils.js';
    import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import PDSTable from '$lib/components/PDSTable.svelte';
	
    export let data;

	const search = writable($page.url.searchParams.get('q') || '')

	function gotoNewTableState () {
		const path = '/pds' + ($search !== '' ? `?q=${$search}` : '')
		const currentPath = $page.url.pathname + $page.url.search
		if (currentPath === path) {
			return null
		}
		goto(path, { keepFocus: true, noScroll: true })
	}

	search.subscribe((val) => {
		gotoNewTableState()
		return val
	})

    function selectionHandler (i) {
        return goto(`/pds/${i.detail[0]}`)
    }

	$: sourceData = (function filterSourceData (bd) {
		const tokens = $search.split(' ')
		let base = JSON.parse(JSON.stringify(bd)) //.filter(d => d.inspect?.lastOnline)
		let str = []
		for (const t of tokens) {
			const cmatch = t.match(/^country:([\w]{2})$/)
			if (cmatch) {
				console.log(cmatch[1])
				base = base.filter(b => {
					if (!b.ip) {
						return false
					}
					return b.ip.country.toLowerCase() === cmatch[1].toLowerCase()
				})
			} else {
				str.push(t)
			}
		}
		const txt = str.join(' ').trim()
		if (txt) {
			base = base.filter(i => i.url.match(new RegExp(txt, 'i')))
		}
		return base

	})(data.pds)

	function formSubmit() {
		const url = '?q='+$search
		goto(url)
		return false
	}


</script>

<svelte:head>
	<title>PDS Instances | ATScan</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">PDS Instances ({sourceData.length})</h1>
	<form on:submit|preventDefault={formSubmit} class="flex gap-4">
		<input class="input" title="Input (text)" type="text" placeholder="Search for PDS .." bind:value={$search} />
		<!--button type="submit" class="btn variant-filled">Search</button-->
	</form>
	<PDSTable {sourceData} {data} />
</div>