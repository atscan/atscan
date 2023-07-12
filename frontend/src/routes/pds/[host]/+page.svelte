<script>
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import DIDTable from '$lib/components/DIDTable.svelte';
	import { formatNumber, dateDistance, getFlagEmoji, getPDSStatus } from '$lib/utils.js';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import { onMount } from 'svelte';
	import { request } from '$lib/api';
	import { TabGroup, Tab, TabAnchor, ProgressRadial, SlideToggle } from '@skeletonlabs/skeleton';
	import { writable } from 'svelte/store';

	export let data;

	const chartResponseTimesTab = writable(0);
	let chartResponseTimes = null;

	const item = data.item;
	const status = getPDSStatus(item);

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
				title: 'Invite code required?',
				value: item.inspect?.current?.data?.inviteCodeRequired
					? 'Yes'
					: 'No - open registrations' || 'n/a'
			},
			{
				title: 'DID count',
				value: `${formatNumber(item.didsCount)} (<a href="/dids?q=pds:${
					item.host
				}" class="anchor">list</a>)`
			},
			,
			/*{
				title: 'Response time',
				value: item.inspect?.current?.ms
					? item.inspect?.current?.ms + 'ms (from Central Europe)'
					: `Error`
			}*/ {
				title: 'Last online',
				value:
					(item.inspect?.lastOnline
						? `${dateDistance(item.inspect?.lastOnline)} ago (${item.inspect?.lastOnline})`
						: 'never') +
					` (<a href="${item.url}/xrpc/com.atproto.server.describeServer" class="anchor">inspect</a>)`
			} /*
			item.inspect?.current?.err
				? {
						title: 'Error',
						value: item.inspect?.current?.err ? `${item.inspect.current.err}` : '-'
				  }
				: null,*/,
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

	const crawlers = {
		local: {
			location: 'Prague, CZ',
			country: 'cz',
			region: 'Central Europe'
		},
		texas: {
			location: 'Dallas, TX, US',
			country: 'us',
			region: 'North America'
		},
		tokyo: {
			location: 'Tokyo, JP',
			country: 'jp',
			region: 'East Asia'
		}
	};

	function renderLatencyChart(chartData) {
		return {
			animationDuration: 250,
			tooltip: {
				trigger: 'axis',
				valueFormatter: (val) => `${val !== undefined ? formatNumber(val) : '-'} ms`
			},
			legend: {
				data: Object.keys(crawlers).map((c) => `${crawlers[c].region} (${crawlers[c].location})`)
			},
			grid: {
				left: '2%',
				right: '2%',
				bottom: '3%',
				containLabel: true
			},
			toolbox: {
				feature: {
					saveAsImage: {}
				}
			},
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data:
					chartData
						.filter((r) => r.table === 0)
						.map((r) => r._time)
						.slice(0, -1) || []
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: '{value} ms'
				}
			},
			series: Object.keys(crawlers).map((crawler) => {
				const crawlerOptions = crawlers[crawler];
				return {
					name: `${crawlerOptions.region} (${crawlerOptions.location})`,
					type: 'line',
					//stack: 'ms',
					data:
						chartData
							.filter((r) => r.crawler === crawler)
							.map((r) => r._value)
							.slice(0, -1) || []
				};
			})
		};
	}

	const latencyConfig = ['24h', '7d', '30d'];

	chartResponseTimesTab.subscribe(async (num) => {
		chartResponseTimes = null;
		const latencyData = await request(
			fetch,
			`/pds/${item.host}/latency?range=${latencyConfig[num]}`
		);
		if (latencyData) {
			chartResponseTimes = renderLatencyChart(latencyData.data);
		}
	});

	onMount(async () => {
		const latencyData = await request(fetch, `/pds/${item.host}/latency`);
		if (latencyData) {
			chartResponseTimes = renderLatencyChart(latencyData.data);
		}
	});
</script>

<BasicPage {data} title={item.host} {breadcrumb} noHeader="true">
	<h1 class="h1">
		{item.host}
		<i
			class="text-base md:text-xl align-[0.2em] md:align-[0.3em] mt-1.5 mr-1.5 {status.ico ||
				'fa-solid fa-circle'} {status.color}"
			alt={status.text}
			title={status.text}
		/>
	</h1>

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

	<h2 class="h2">Response times</h2>

	<TabGroup>
		<Tab bind:group={$chartResponseTimesTab} name="tab1" value={0}>Last 24h</Tab>
		<Tab bind:group={$chartResponseTimesTab} name="tab2" value={1}>Last 7d</Tab>
		<Tab bind:group={$chartResponseTimesTab} name="tab3" value={2}>Last 30d</Tab>
		<!-- Tab Panels --->
		<svelte:fragment slot="panel">
			<div class="w-full h-64">
				{#if chartResponseTimes}
					<Chart options={chartResponseTimes} />
				{:else}
					<div class="flex items-center justify-center w-full h-full">
						<div>
							<ProgressRadial />
						</div>
					</div>
				{/if}
			</div>
		</svelte:fragment>
	</TabGroup>

	<div class="table-container">
		<!-- Native Table Element -->
		<table class="table table-hover">
			<thead class="table-head">
				<tr>
					<th class="text-sm">Region</th>
					<th class="text-sm">Location</th>
					<th class="text-sm">Status</th>
					<th class="text-sm">Latency</th>
					<th class="text-sm">Last check</th>
				</tr>
			</thead>
			<tbody class="table-body">
				{#each Object.keys(crawlers).map((c) => [c, crawlers[c]]) as [crawlerId, crawler]}
					<tr>
						<td>{crawler.region}</td>
						<td
							><img
								src="/cc/{crawler.country.toLowerCase()}.png"
								alt={crawler.country}
								title={crawler.country}
								class="inline-block mr-2"
							/>{crawler.location}</td
						>
						<td
							>{#if item.inspect[crawlerId]?.err}
								<i class="fa-solid fa-circle text-red-500 text-xs mr-1" /> Error:
								<span class="code">{item.inspect[crawlerId].err}</span>
							{:else if !item.inspect[crawlerId]}
								<i class="fa-solid fa-circle text-gray-500 text-xs mr-1" /> Unknown
							{:else}
								<i class="fa-solid fa-circle text-green-500 text-xs mr-1" /> OK
							{/if}</td
						>
						<td
							>{#if item.inspect[crawlerId]?.ms}{item.inspect[crawlerId].ms}ms{:else}-{/if}</td
						>
						<td>
							{#if item.inspect[crawlerId]?.time}
								<span title={item.inspect[crawlerId].time} alt={item.inspect[crawlerId].time}>
									{dateDistance(item.inspect[crawlerId].time)} ago
								</span>
							{:else}-{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
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

	<SourceSection {data} model="pds" hide="true" />
</BasicPage>
