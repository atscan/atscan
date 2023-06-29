<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import DIDTable from '$lib/components/DIDTable.svelte';
	import { formatNumber, dateDistance, getFlagEmoji } from '$lib/utils.js';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const item = data.item;

	const infoMaps = [];
	infoMaps.push({
		items: [
			{
				title: 'PLCs used',
				value: item.plcs
					.map((p) => {
						const host = p.replace(/^https?:\/\//, '');
						return `<a href="/dids?q=plc:${host}" class="anchor">${host}</a>`;
					})
					.join(', ')
			},
			{
				title: 'User domains',
				value: item.inspect?.current?.data?.availableUserDomains?.join(', ') || 'n/a'
			},
			{
				title: 'DID count',
				value: `${formatNumber(item.didsCount)} (<a href="/dids?q=pds:${
					item.host
				}" class="anchor">list</a>)`
			},
			{
				title: 'Response time',
				value: item.inspect?.current?.ms
					? item.inspect?.current?.ms + 'ms (from Central Europe)'
					: `Error`
			},
			{
				title: 'Last online',
				value:
					(item.inspect?.lastOnline
						? `${dateDistance(item.inspect?.lastOnline)} ago (${item.inspect?.lastOnline})`
						: 'never') +
					` (<a href="${item.url}/xrpc/com.atproto.server.describeServer" class="anchor">inspect</a>)`
			},
			item.inspect?.current?.err
				? {
						title: 'Error',
						value: item.inspect?.current?.err ? `${item.inspect.current.err}` : '-'
				  }
				: null,
			{
				title: 'Last scan',
				value: item.inspect?.current?.time
					? `${dateDistance(item.inspect?.current?.time)} ago (${item.inspect?.current?.time})`
					: '-'
			}
		]
	});
	infoMaps.push({
		title: item.ip
			? `<span class="text-2xl">${getFlagEmoji(item.ip.country)}</span> <a href="http://ipinfo.io/${
					item.ip.ip
			  }" target="_blank" class="anchor">${item.ip.ip}</a>`
			: 'ip not available',
		items: [
			{ title: 'Host', value: item.ip?.hostname || '-' },
			{
				title: 'Location',
				value: item.ip
					? `${item.ip.country} - ${item.ip.city}, ${item.ip.region} (<a href="https://www.google.com/maps?q=${item.ip.loc}" target="_blank" class="anchor">${item.ip.loc})</a>`
					: '-'
			},
			//{ title: 'Coordinates', value: item.ip.loc },
			{ title: 'AS / Organization', value: item.ip?.org || '-' },
			//{ title: 'Postal code', value: item.ip.postal },
			{ title: 'Timezone', value: item.ip?.timezone || '-' }
		]
	});

	const breadcrumb = [{ label: 'PDS Instances', link: '/pds' }];
	if (item.fed) {
		breadcrumb.push({
			label: `<span class="mr-2 badge bg-ats-fed-${item.fed} text-white dark:text-black">${item.fed}</span> federation`,
			link: `/pds?q=fed:${item.fed}`
		});
	}
</script>

<BasicPage {data} title={item.host} {breadcrumb}>
	<div class="lg:grid grid-cols-2 gap-4">
		{#each infoMaps as map}
			<div class="card bg-white/20 p-4 lg:mb-0 mb-2">
				{#if map.title}
					<h3 class="h4 uppercase mb-2">{@html map.title}</h3>
				{/if}
				<div class="">
					{#each map.items.filter((i) => Boolean(i)) as i}
						<div class="flex gap-2 w-full mb-1">
							<div class="font-semibold">{i.title}</div>
							<div class="">{@html i.value}</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<h2 class="h2">
		<a href="/dids?q=pds:{item.host}">DIDs</a>
		<span class="font-normal text-2xl">({formatNumber(data.dids.count)})</span>
	</h2>
	<DIDTable sourceData={data.dids.items} {data} />
	{#if data.dids.count > data.dids.items.length}
		<div>
			<a href="/dids?q=pds:{item.host}"
				><button class="btn variant-filled"
					>Show all {formatNumber(data.dids.count)} DIDs hosted by {item.host}</button
				></a
			>
		</div>
	{/if}

	<SourceSection {data} model="pds" />
</BasicPage>
