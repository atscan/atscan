<script>
	import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance } from '$lib/utils.js';
    import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { redirect } from '@sveltejs/kit';
	
    export let data;
	const search = writable($page.url.searchParams.get('q'))

    function selectionHandler (i) {
        return goto(`/pds/${i.detail[0]}`)
    }

	function tableMapperValuesLocal (source, keys) {
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
				if (key === 'plcs' && val) {
					val = val.map(i => i.replace(/^https?:\/\//, '')).join(', ')
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
					val = `<a href="/pds/${val}" class="hover:underline"><span class="font-semibold text-lg">${val}</span></a>`
				}
				if (key === 'ms') {
					val = row.inspect?.current.err
						? `<a href="${row.url}/xrpc/com.atproto.server.describeServer" target="_blank" title="${row.inspect.current.err}" class="hover:underline">error</a>`
						: row.inspect?.current.ms ? `<a href="${row.url}/xrpc/com.atproto.server.describeServer" target="_blank" class="hover:underline">${row.inspect.current.ms + 'ms'}</a>` : '-'
				}
				if (key === 'userDomains') {
					val = row.inspect?.current.data?.availableUserDomains.join(', ')
				}
				if (key === 'location') {
					val = row.ip && row.ip.country
						? `<img src="/cc/${row.ip.country.toLowerCase()}.png" alt="${row.ip.country}" title="${row.ip.country}" class="inline-block mr-2" />`
						: ''
					if (row.ip && row.ip.city) {
						val += `${row.ip.city} - `
					}
					const dnsIp = row.dns ? row.dns.Answer?.filter(a => a.type === 1)[0].data : null
					val += `<a href="http://ipinfo.io/${dnsIp}" target="_blank" class="hover:underline">${dnsIp}</a>` || '-'
					if (row.ip && row.ip.regionName) {
						val += ' ('+row.ip.regionName+')'
					}
					val += `<br /><span class="text-xs">${row.ip?.org || 'n/a'}</span>`
				}
				if (key === 'didsCount') {
					val = `<a href="/did?pds=${row.host}" class="hover:underline">${val}</a>`
				}
				if (key === 'lastOnline' && row.inspect) {
					val = row.inspect?.lastOnline ? dateDistance(row.inspect?.lastOnline) : '-'
				}

				return mappedRow[key] = val
			});
			return mappedRow;
		}))
	}

	const filtered = data.pds.filter(d => d.inspect?.lastOnline)
	let sourceData = JSON.parse(JSON.stringify(filtered))
	let sourceDataOffline = data.pds.filter(d => !d.inspect?.lastOnline)


	function formSubmit() {
		const url = '?q='+$search
		//goto(url)
		// refilter
		sourceData = data.pds.filter(d => d.inspect?.lastOnline).filter(i => i.url.match(new RegExp($search, 'i')))
		genTableSimple()
		return false
	}

	let tableSimple;
	function genTableSimple () {
		tableSimple = {
			// A list of heading labels.
			head: ['Federation', 'Host', 'Delay', 'Location', 'DIDs', 'PLCs', 'User Domains', 'Last mod'],
			// The data visibly shown in your table body UI.
			//body: mapper(sourceData, ['host', 'type', 'plc']),
			body: tableMapperValuesLocal(sourceData, ['env', 'host', 'ms', 'location', 'didsCount', 'plcs', 'userDomains', 'lastOnline' ]),
			// Optional: The data returned when interactive is enabled and a row is clicked.
			meta: tableMapperValues(sourceData, ['host']),
			// Optional: A list of footer labels.
			//foot: ['Total', '', '<code class="code">5</code>']
		};
	}
	genTableSimple()

	const tableSimpleOffline = {
		// A list of heading labels.
		head: ['Federation', 'Host', 'Delay', 'Location', 'DIDs', 'PLCs',],
		body: tableMapperValuesLocal(sourceDataOffline, ['env', 'host', 'ms', 'location', 'didsCount', 'plcs']),
		meta: tableMapperValues(sourceDataOffline, ['host']),
	};

</script>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">PDS Instances ({sourceData.length})</h1>

	<form on:submit={formSubmit} class="flex gap-4">
		<input class="input" title="Input (text)" type="text" placeholder="Search for PDS .." bind:value={$search} />
		<button type="submit" class="btn variant-filled">Search</button>
	</form>

	<!--p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p-->

	<!--h2 class="h2">Active instances ({sourceData.length})</h2-->
	<Table source={tableSimple} interactive={true} on:selected={selectionHandler} />

	<!--<h2 class="h2">Inactive instances ({sourceDataOffline.length})</h2>
	<Table source={tableSimpleOffline} />-->
</div>