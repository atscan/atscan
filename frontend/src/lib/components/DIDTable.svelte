<script>
	import { createEventDispatcher } from 'svelte';
	import Table from '$lib/components/Table.svelte';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import {
		dateDistance,
		identicon,
		formatNumber,
		customTableMapper,
		getDIDProfileUrl,
		filesize
	} from '$lib/utils.js';
	import { format } from 'echarts';
	export let sourceData;
	export let data;

	const dispatch = createEventDispatcher();

	function onHeadSelected(event) {
		dispatch('headSelected', event.detail);
	}

	function tableMap({ val, key, row }) {
		if (key === 'srcHost') {
			val = row.pds
				.map((i) => {
					const host = i.replace(/^https?:\/\//, '');
					return `<a href="/pds/${host}" class="anchor">${host}</a>`;
				})
				.join(', ');
			val += `<div>(<a href="/dids?q=plc:${row.srcHost}" class="anchor">${row.srcHost}</a>)</div>`;
		}
		if (key === 'did') {
			const did = val;
			const fed = row.fed ? data.ecosystem.data.federations.find((f) => f.id === row.fed) : null;
			const link = getDIDProfileUrl(fed, row);
			val = `<div class="flex gap-6">`;
			val += `    <div>`;
			val += `        <div class="text-lg inline-block"><a href="/${did}" class=""><span class="opacity-50">did:plc:</span><span class="font-semibold opacity-100">${did.replace(
				/^did:plc:/,
				''
			)}</span></a></div>`;
			const asa = row.revs[row.revs.length - 1].operation?.alsoKnownAs;
			const handles = asa
				? asa
						.filter((h) => h.match(/^at:\/\//))
						.map((h) => h.replace(/^at:\/\//, ''))
						.filter((h) => h.match(/^[a-z0-9\.\-]+$/))
				: [];
			val += `        <div class="mt-1.5">`;
			if (fed) {
				val += `            <span class="mr-2 badge text-xs variant-filled bg-ats-fed-${fed.id} dark:bg-ats-fed-${fed.id} opacity-70 text-white dark:text-black">${fed.id}</span>`;
			}
			val +=
				`            <span>${handles
					.map(
						(h) =>
							`<a href="${link}" target="_blank" class="anchor">@${
								h.length > 40 ? h.substring(0, 40) + '..' : h
							}</a>`
					)
					.join(', ')} ` +
				(row.revs.length > 1 ? `(#${row.revs.length - 1})` : '') +
				`</span>`;
			val += `        </div>`;
			val += `    </div>`;
			val += '</div>';
		}
		if (key === 'lastMod') {
			val = `<span class="text-sm">${dateDistance(val)} ago</span>`;
		}
		if (key === 'img') {
			val = `<div class="text-right w-full"><div class="inline-block w-16 h-16"><a href="/${
				row.did
			}"><img src="${identicon(
				row.did
			)}" class="w-full h-full bg-white dark:bg-gray-800 float-left" /></a></div></div>`;
		}
		if (key === 'did_raw') {
			val = row.did;
		}
		if (key === 'url') {
			val = `/${row.did}`;
		}
		if (key === 'commits') {
			val = row.repo?.commits ? formatNumber(row.repo.commits) : '-';
		}
		if (key === 'size') {
			val =
				'<div class="text-lg">' +
				(row.repo?.size
					? filesize(row.repo.size) +
					  '</div><div>' +
					  formatNumber(
							Object.keys(row.repo.collections).reduce((t, c) => (t += row.repo.collections[c]), 0)
					  ) +
					  ' items</div>'
					: '-');
		}
		return val;
	}
	$: tableSimple = {
		// A list of heading labels.
		head: [
			'',
			['DID', 'did'],
			['PDS (PLC)', 'pds'],
			['Repo size', 'size'],
			['Commits', 'commits'],
			['Updated', 'lastMod']
		],
		body: customTableMapper(
			sourceData || [],
			['img', 'did', 'srcHost', 'size', 'commits', 'lastMod'],
			tableMap
		),
		meta: customTableMapper(sourceData || [], ['did_raw', 'url'], tableMap)
	};
</script>

<Table
	source={tableSimple}
	currentSort={data.sort}
	defaultSort=""
	on:headSelected={(e) => onHeadSelected(e)}
/>
