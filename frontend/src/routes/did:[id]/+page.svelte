<script>
	import { dateDistance, identicon } from '$lib/utils.js';
	import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import PDSTable from '$lib/components/PDSTable.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const item = data.item;
	const handles = item.revs[item.revs.length - 1].operation.alsoKnownAs.map((h) =>
		h.replace(/^at:\/\//, '')
	);

	function tableMapperValuesLocal(source, keys) {
		let i = 0;
		return tableSourceValues(
			source
				.map((row) => {
					const mappedRow = {};
					keys.forEach((key) => {
						let val = row[key];
						if (key === 'num') {
							val = String('#' + i);
						}
						if (key === 'handle') {
							val = row.operation.alsoKnownAs.map((a) => a.replace(/^at:\/\//, '@')).join(', ');
						}
						if (key === 'createdAt') {
							val = `<span title="${val}" alt="${val}">${dateDistance(val)}</span>`;
						}
						return (mappedRow[key] = val);
					});
					i++;
					return mappedRow;
				})
				.reverse()
		);
	}

	const sourceData = item.revs;
	const historyTable = {
		head: ['#', 'Handle', 'CID', 'Age'],
		body: tableMapperValuesLocal(sourceData, ['num', 'handle', 'cid', 'createdAt']),
		meta: tableMapperValues(sourceData, ['cid'])
	};
</script>

<BasicPage
	{data}
	title={item.did}
	noHeader="true"
	breadcrumb={[
		{ label: 'DIDs', link: '/dids' },
		{
			label: `<span class="mr-2 badge ${
				item.env ? 'bg-ats-fed-' + item.env : 'bg-gray-500'
			} text-white dark:text-black">${item.env}</span> federation`,
			link: `/dids?q=${item.env}`
		}
	]}
>
	<div class="flex gap-4 md:gap-6">
		<div class="w-24 h-24 md:w-40 md:h-40 shrink-0">
			<img
				src={identicon(item.did)}
				class="w-full h-full bg-white dark:bg-gray-800 float-left"
				alt={item.did}
			/>
		</div>
		<div class="grow">
			<h1 class="h1">
				<span class="opacity-50 font-normal">did:plc:</span><span
					class="font-semibold opacity-100 break-all">{item.did.replace(/^did:plc:/, '')}</span
				>
			</h1>
			<div class="h3 mt-4">
				{@html handles
					.map(
						(h) =>
							`<a href="https://bsky.app/profile/${h}" target="_blank" class="anchor">@${h}</a>`
					)
					.join(', ')}
			</div>
		</div>
	</div>

	<h2 class="h2">Revisions <span class="font-normal text-2xl">({sourceData.length})</span></h2>
	<Table source={historyTable} />

	{#if data.pds}
		<h2 class="h2">PDS</h2>
		<PDSTable sourceData={data.pds} {data} />
	{/if}

	<SourceSection {data} model="did" />
</BasicPage>
