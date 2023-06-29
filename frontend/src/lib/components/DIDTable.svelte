<script>
	import Table from '$lib/components/Table.svelte';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import { dateDistance, identicon, formatNumber, customTableMapper } from '$lib/utils.js';
	export let sourceData;
	export let data;

	function tableMap({ val, key, row }) {
		if (key === 'srcHost') {
			val = `<a href="/dids?q=plc:${val}" class="anchor">${val}</a>`;
		}
		if (key === 'pds') {
			const host = (val = val
				.map((i) => {
					const host = i.replace(/^https?:\/\//, '');
					return `<a href="/pds/${host}" class='anchor'>${host}</a>`;
				})
				.join(', '));
		}
		if (key === 'did') {
			const did = val;
			const fedId = row.src === 'https://plc.directory' ? 'bluesky' : 'sandbox';
			const fed = data.ecosystem.data.federations.find((f) => f.id === fedId);
			val = `<div class="flex gap-6">`;
			val += `    <div>`;
			val += `        <div class="text-lg inline-block"><a href="/${did}" class=""><span class="opacity-50">did:plc:</span><span class="font-semibold opacity-100">${did.replace(
				/^did:plc:/,
				''
			)}</span></a></div>`;
			const handles = row.revs[row.revs.length - 1].operation.alsoKnownAs
				.filter((h) => !h.match(/at:\/\/data:x\//))
				.map((h) => h.replace(/^at:\/\//, ''));
			val += `        <div class="mt-1.5">`;
			val += `            <span class="mr-2 badge text-xs variant-filled bg-ats-fed-${fed.id} dark:bg-ats-fed-${fed.id} opacity-70 text-white dark:text-black">${fed.id}</span>`;
			val += `            <span>${handles
				.map(
					(h) => `<a href="https://bsky.app/profile/${h}" target="_blank" class="anchor">@${h}</a>`
				)
				.join(', ')}</span>`;
			val += `        </div>`;
			val += `    </div>`;
			val += '</div>';
		}
		if (key === 'time') {
			val = dateDistance(val);
		}
		if (key === 'deep') {
			val = row.revs.length;
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
		return val;
	}
	$: tableSimple = {
		// A list of heading labels.
		head: ['', 'DID', '#', 'PLC', 'PDS', 'Last mod'],
		body: customTableMapper(
			sourceData || [],
			['img', 'did', 'deep', 'srcHost', 'pds', 'time'],
			tableMap
		),
		meta: customTableMapper(sourceData || [], ['did_raw', 'url'], tableMap)
	};
</script>

<Table source={tableSimple} />
