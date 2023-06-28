<script>
	import Table from '$lib/components/Table.svelte';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, formatNumber } from '$lib/utils.js';
    import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	
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

	function tableMapperValuesLocal (source, keys) {
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
				if (key === 'plcs' && val) {
					val = val.map(i => i.replace(/^https?:\/\//, '')).map(p => `<a href="/did?q=plc:${p}" class="anchor">${p}</a>`).join(', ')
					if (row.inspect?.current.data?.availableUserDomains) {
						val += '<br/>(' + row.inspect?.current.data?.availableUserDomains.join(', ') + ')'
					}
				}
				if (key === 'env') {
					let arr = []
					const plc = (val === "sandbox") ? data.plc.find(i => i.code === 'sbox') : ((val === "bsky") ? data.plc.find(i => i.code === 'bsky') : null)
					if (plc) {
						arr.push(`<span class="badge variant-filled ${plc.color} dark:${plc.color} opacity-70 text-white dark:text-black">${plc.name}</span>`)
					}
					val = arr.reverse().join(' ')
				}
				if (key === 'host') {
					val = `<a href="/pds/${val}" class=""><span class="font-semibold text-lg">${val}</span></a>`
				}
				if (key === 'ms') {
					val = row.inspect?.current.err
						? `<a href="${row.url}/xrpc/com.atproto.server.describeServer" target="_blank" title="${row.inspect.current.err}" class="anchor">error</a>`
						: row.inspect?.current.ms ? `<a href="${row.url}/xrpc/com.atproto.server.describeServer" target="_blank" class="anchor">${row.inspect.current.ms + 'ms'}</a>` : '-'
				}
				if (key === 'location') {
					val = row.ip && row.ip.country
						? `<img src="/cc/${row.ip.country.toLowerCase()}.png" alt="${row.ip.country}" title="${row.ip.country}" class="inline-block mr-2" />`
						: '-'
					if (row.ip && row.ip.city) {
						val += `${row.ip.city} - `
					}
					if (row.ip) {
						const dnsIp = row.dns ? row.dns.Answer?.filter(a => a.type === 1)[0].data : null
						val += `<a href="http://ipinfo.io/${dnsIp}" target="_blank" class="anchor">${dnsIp}</a>` || '-'
						if (row.ip && row.ip.regionName) {
							val += ' ('+row.ip.regionName+')'
						}
						val += `<br /><span class="text-xs">${row.ip?.org || 'n/a'}</span>`
					}
				}
				if (key === 'didsCount') {
					val = `<a href="/did?q=pds:${row.host}" class="anchor">${formatNumber(val)}</a>`
				}
				if (key === 'lastOnline' && row.inspect) {
					val = `<span class="text-xs">${row.inspect?.lastOnline ? dateDistance(row.inspect?.lastOnline) + ' ago' : '-'}</span>`
				}
				if (key === 'host_raw') {
					val = row.host
				}
				if (key === 'url') {
					val = `/pds/${row.host}`
				}

				return mappedRow[key] = val
			});
			return mappedRow;
		}))
	}

	const baseData = data.pds //.filter(d => d.inspect?.lastOnline)

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
		console.log(base.length)
		return base

	})(baseData)

	function formSubmit() {
		const url = '?q='+$search
		goto(url)
		return false
	}

	$: tableSimple = {
		head: ['Federation', 'Host', 'DIDs', 'Location', 'PLCs (User Domains)', 'Resp. time', 'Last Online'],
		body: tableMapperValuesLocal(sourceData, ['env', 'host', 'didsCount', 'location', 'plcs', 'ms', 'lastOnline' ]),
		meta: tableMapperValuesLocal(sourceData, ['host_raw', 'url']),
	};

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
	<Table source={tableSimple} />
</div>