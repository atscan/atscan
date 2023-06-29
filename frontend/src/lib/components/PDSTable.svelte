<script>
	import Table from '$lib/components/Table.svelte';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, identicon, formatNumber, customTableMapper } from '$lib/utils.js';
	export let sourceData;
	export let data;

	function tableMap({ val, key, row }) {
		if (key === 'plcs' && val) {
			val = val
				.map((i) => i.replace(/^https?:\/\//, ''))
				.map((p) => `<a href="/dids?q=plc:${p}" class="anchor">${p}</a>`)
				.join(', ');
			if (
				row.inspect?.current.data?.availableUserDomains &&
				row.inspect.current.data.availableUserDomains.length > 0
			) {
				val += '<br/>(' + row.inspect?.current.data?.availableUserDomains.join(', ') + ')';
			}
		}
		if (key === 'fed') {
			let arr = [];
			const fed = data.ecosystem.data.federations.find((f) => f.id === val);
			if (fed) {
				arr.push(
					`<span class="badge variant-filled bg-ats-fed-${fed.id} dark:bg-ats-fed-${fed.id} opacity-70 text-white dark:text-black">${fed.id}</span>`
				);
			}
			val = arr.reverse().join(' ');
		}
		if (key === 'host') {
			val = `<a href="/pds/${val}" class=""><span class="font-semibold text-lg">${val}</span></a>`;
		}
		if (key === 'ms') {
			val = row.inspect?.current.err
				? `<a href="${row.url}/xrpc/com.atproto.server.describeServer" target="_blank" title="${row.inspect.current.err}" class="anchor">error</a>`
				: row.inspect?.current.ms
				? `<a href="${
						row.url
				  }/xrpc/com.atproto.server.describeServer" target="_blank" class="anchor">${
						row.inspect.current.ms + 'ms'
				  }</a>`
				: '-';
		}
		if (key === 'location') {
			val =
				row.ip && row.ip.country
					? `<img src="/cc/${row.ip.country.toLowerCase()}.png" alt="${row.ip.country}" title="${
							row.ip.country
					  }" class="inline-block mr-2" />`
					: '-';
			if (row.ip && row.ip.city) {
				val += `${row.ip.city} - `;
			}
			if (row.ip) {
				const dnsIp = row.dns ? row.dns.Answer?.filter((a) => a.type === 1)[0].data : null;
				val +=
					`<a href="http://ipinfo.io/${dnsIp}" target="_blank" class="anchor">${dnsIp}</a>` || '-';
				if (row.ip && row.ip.regionName) {
					val += ' (' + row.ip.regionName + ')';
				}
				val += `<br /><span class="text-xs">${row.ip?.org || 'n/a'}</span>`;
			}
		}
		if (key === 'didsCount') {
			val = `<a href="/dids?q=pds:${row.host}" class="anchor">${formatNumber(val)}</a>`;
		}
		if (key === 'lastOnline' && row.inspect) {
			val = `<span class="text-xs">${
				row.inspect?.lastOnline ? dateDistance(row.inspect?.lastOnline) + ' ago' : '-'
			}</span>`;
		}
		if (key === 'host_raw') {
			val = row.host;
		}
		if (key === 'url') {
			val = `/pds/${row.host}`;
		}
		return val;
	}
	$: tableSimple = {
		head: [
			'Federation',
			'Host',
			'DIDs',
			'Location',
			'PLCs (User Domains)',
			'Resp. time',
			'Last Online'
		],
		body: customTableMapper(
			sourceData,
			['fed', 'host', 'didsCount', 'location', 'plcs', 'ms', 'lastOnline'],
			tableMap
		),
		meta: customTableMapper(sourceData, ['host_raw', 'url'], tableMap)
	};
</script>

<Table source={tableSimple} />
