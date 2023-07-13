<script>
	import { createEventDispatcher } from 'svelte';
	import Table from '$lib/components/Table.svelte';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import {
		dateDistance,
		identicon,
		formatNumber,
		customTableMapper,
		getPDSStatus,
		filesize
	} from '$lib/utils.js';
	export let sourceData;
	export let data;
	export let sorting = false;

	const dispatch = createEventDispatcher();

	function onHeadSelected(event) {
		dispatch('headSelected', event.detail);
	}

	function onFavoriteClick(event) {
		dispatch('favoriteClick', event.detail);
	}

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
					`<span class="mt-0.5 badge variant-filled bg-ats-fed-${fed.id} dark:bg-ats-fed-${fed.id} opacity-70 text-white dark:text-black">${fed.id}</span>`
				);
			}
			val = arr.reverse().join(' ');
		}
		if (key === 'host') {
			val = `<div class="inline-block align-top"><a href="/pds/${val}" class=""><span class="font-semibold text-lg">${val}</span></a>`;

			if (
				row.inspect?.current.data?.availableUserDomains &&
				row.inspect.current.data.availableUserDomains.length > 0
			) {
				val +=
					'<div class="text-xs opacity-75">' +
					row.inspect?.current.data?.availableUserDomains.join(', ') +
					'</div>';
			}
			val += `</div>`;
		}
		if (key === 'responseTime') {
			val = row.responseTime ? '~' + Math.round(row.responseTime) + 'ms' : '-';
		}
		if (key === 'location') {
			val =
				row.ip && row.ip.country
					? `<img src="/cc/${row.ip.country.toLowerCase()}.png" alt="${row.ip.country}" title="${
							row.ip.country
					  }" class="inline-block mr-2" />`
					: '-';
			if (row.ip && row.ip.city) {
				val += `${row.ip.city}, ${row.ip.country}`;
			}
			if (row.ip) {
				const dnsIp = row.dns ? row.dns.Answer?.filter((a) => a.type === 1)[0].data : null;
				/*val +=
					`<a href="http://ipinfo.io/${dnsIp}" target="_blank" class="anchor">${dnsIp}</a>` || '-';
				if (row.ip && row.ip.regionName) {
					val += ' (' + row.ip.regionName + ')';
				}*/
				val += `<br /><span class="text-xs opacity-75">${
					row.ip?.org?.replace(/^AS\d+ /, '') || 'n/a'
				}</span>`;
			}
		}
		if (key === 'didsCount') {
			val = `<a href="/dids?q=pds:${row.host}" class="anchor">${formatNumber(val)}</a>`;
		}
		if (key === 'size') {
			val = row.size
				? `<span alt="${row.size}" title="${row.size}">${filesize(row.size)}</span>`
				: '-';
		}
		if (key === 'lastOnline' && row.inspect) {
			val = `<span class="text-xs">${
				row.inspect.lastOnline && !row.inspect?.current?.err
					? 'now'
					: row.inspect.lastOnline
					? dateDistance(row.inspect.lastOnline) + ' ago'
					: '-'
			}</span>`;
		}
		if (key === 'time') {
			val = `<span class="text-xs">${dateDistance(row.time)} ago</span>`;
		}
		if (key === 'host_raw') {
			val = row.host;
		}
		if (key === 'url') {
			val = `/pds/${row.host}`;
		}
		if (key === 'status') {
			const { color, ico, text } = getPDSStatus(row);
			val = `<i class="mt-1.5 mr-1.5 ${
				ico || 'fa-solid fa-circle'
			} ${color}" alt="${text}" title="${text}"></i>`;
			//(row.inspect.current?.ms ? `<span class="text-xs opacity-50">${row.inspect.current?.ms}ms</span>` : '')
		}
		return val;
	}
	$: tableSimple = {
		head: [
			['Federation', 'fed'],
			'',
			['Host', 'host'],
			['DIDs', 'didsCount'],
			['Size', 'size'],
			['Location / Provider', 'country'],
			//['PLCs (User Domains)', 'plcs'],
			['Latency', 'responseTime'],
			['First seen', 'time'],
			['Last Online', 'lastOnline']
		],
		body: customTableMapper(
			sourceData,
			[
				'fed',
				'status',
				'host',
				'didsCount',
				'size',
				'location',
				//'plcs',
				'responseTime',
				'time',
				'lastOnline'
			],
			tableMap
		),
		meta: customTableMapper(sourceData, ['host_raw', 'url', '_isChange', '_isFavorite'], tableMap)
	};
</script>

<Table
	source={tableSimple}
	{sorting}
	currentSort={data.sort}
	defaultSort=""
	favoriteColumn={2}
	on:favoriteClick={(e) => onFavoriteClick(e)}
	on:headSelected={(e) => onHeadSelected(e)}
/>
