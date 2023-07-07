<script>
	import { dateDistance, identicon, getDIDProfileUrl, filesize, formatNumber } from '$lib/utils.js';
	import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import SourceSection from '$lib/components/SourceSection.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import PDSTable from '$lib/components/PDSTable.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import { onMount } from 'svelte';

	export let data;

	const item = data.item;
	const asa = item.revs[item.revs.length - 1].operation?.alsoKnownAs;
	const handles = asa ? asa.map((h) => h.replace(/^at:\/\//, '')) : [];
	let handleVerification = null;

	async function verifyHandle(handle, did) {
		const verifications = [];
		// firstly we try DNS style
		const dnsCheckUrl = `https://dns.google/resolve?name=_atproto.${handle}&type=TXT`;
		const dnsResp = await fetch(dnsCheckUrl);
		const dnsData = await dnsResp.json();
		verifications.push({
			verified:
				dnsData.Answer && dnsData.Answer.find((a) => a.type === 16 && a.data === `did=${did}`),
			type: 'dns',
			url: dnsCheckUrl
		});
		// if DNS verification failed, then we try http based
		if (!verifications[0].verified) {
			const httpCheckUrl = `https://${handle}/.well-known/atproto-did`;
			const httpResp = await fetch(httpCheckUrl);
			const httpString = await httpResp.text();
			verifications.push({
				verified: httpString.includes(did),
				type: 'http',
				url: httpCheckUrl
			});
		}
		return verifications;
	}

	function tableMapperValuesLocal(source, keys) {
		let i = 0;
		return tableSourceValues(
			source
				.map((row) => {
					const mappedRow = {};
					keys.forEach((key, rowNumber) => {
						let val = row[key];
						if (key === 'num') {
							val = String('#' + i);
						}
						if (key === 'handle') {
							const handle = row.operation?.alsoKnownAs
								? row.operation?.alsoKnownAs[0].replace(/^at:\/\//, '')
								: null;
							if (handle) {
								val = `@${handle}`;
								if (i === source.length - 1) {
									let hstr = null;
									console.log(handleVerification);
									if (handleVerification === null) {
										hstr =
											'<i class="fa-solid fa-clock opacity-30" alt="Loading .." title="Loading .."></i>';
									} else if (handleVerification && handleVerification.find((v) => v.verified)) {
										const method = handleVerification.find((v) => v.verified);
										hstr = `<i class="fa-solid fa-circle-check text-green-500" alt="Verified" title="Verified"></i> <span class="text-xs text-green-500 uppercase">${method.type}</span>`;
									} else {
										hstr =
											'<i class="fa-solid fa-circle-xmark text-red-500" alt="Not verified" title="Not verified"></i>';
									}
									if (hstr) {
										if (handleVerification) {
											val += `<a href="${
												handleVerification.find((v) => v.verified)?.url || handleVerification[0].url
											}" class="ml-3" target="_blank">${hstr}</a>`;
										} else {
											val += `<div class="inline-block ml-3">${hstr}</div>`;
										}
									}
								}
							}
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
	let historyTable = renderTable();

	function renderTable() {
		return {
			head: ['#', 'Handle', 'CID', 'Age'],
			body: tableMapperValuesLocal(sourceData, ['num', 'handle', 'cid', 'createdAt']),
			meta: tableMapperValues(sourceData, ['cid'])
		};
	}

	const fed = item.fed ? data.ecosystem.data.federations.find((f) => f.id === item.fed) : null;
	const breadcrumb = [{ label: 'DIDs', link: '/dids' }];
	if (item.fed) {
		breadcrumb.push({
			label: `<span class="mr-2 badge bg-ats-fed-${item.fed} text-white dark:text-black">${item.fed}</span> federation`,
			link: `/dids?q=fed:${item.fed}`
		});
	}

	let current;
	let currentError;

	$: records =
		item.repo && item.repo.collections
			? Object.keys(item.repo?.collections).reduce((t, c) => (t += item.repo.collections[c]), 0)
			: null;

	onMount(async () => {
		if (item.repo) {
			try {
				const res = await fetch(
					`${item.pds[0]}/xrpc/com.atproto.sync.getCommitPath?did=${item.did}&earliest=${item.repo.root}`
				);
				current = await res.json();
				if (current.commits[current.commits.length - 1] === item.repo.root) {
					current.commits = [];
				}
			} catch (e) {
				currentError = e.message;
			}
		}
		if (handles && handles[0]) {
			handleVerification = await verifyHandle(handles[0], item.did);
			historyTable = renderTable();
		}
	});
</script>

<BasicPage {data} title={item.did} noHeader="true" {breadcrumb}>
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
							`<a href="${getDIDProfileUrl(fed, item)}" target="_blank" class="anchor">@${h}</a>`
					)
					.join(', ')}
			</div>
		</div>
	</div>

	{#if item.repo && item.repo.profile}
		<div class="table-container">
			<!-- Native Table Element -->
			<table class="table table-hover">
				<tbody>
					<tr>
						<th class="text-right md:w-64">Name</th>
						<td>{item.repo.profile.displayName || '-'}</td>
					</tr>
					<tr>
						<th class="text-right">Description</th>
						<td>{item.repo.profile.description || '-'}</td>
					</tr>
					{#if item.repo.profile.avatar}
						<tr>
							<th class="text-right">Avatar</th>
							<td
								><img
									src={`${item.pds[0]}/xrpc/com.atproto.sync.getBlob?did=${item.did}&cid=${item.repo.profile.avatar.ref.$link}`}
									class="w-40"
								/></td
							>
						</tr>
					{/if}
					{#if item.repo.profile.banner}
						<tr>
							<th class="text-right">Banner</th>
							<td
								><img
									src={`${item.pds[0]}/xrpc/com.atproto.sync.getBlob?did=${item.did}&cid=${item.repo.profile.banner.ref.$link}`}
									class="w-40"
								/></td
							>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}

	<h2 class="h2">History <span class="font-normal text-2xl">({sourceData.length})</span></h2>
	<Table source={historyTable} />

	{#if data.pds}
		<h2 class="h2">PDS</h2>
		<PDSTable sourceData={data.pds} {data} />
	{/if}

	<h2 class="h2">Repository</h2>
	{#if item.repo && !item.repo.error && item.repo.root}
		<div class="table-container">
			<!-- Native Table Element -->
			<table class="table table-hover">
				<tbody>
					<tr>
						<th class="text-right">Head</th>
						<td>{item.repo.root}</td>
					</tr>
					<tr>
						<th class="text-right">Signing Key</th>
						<td>{item.repo.signingKey}</td>
					</tr>
					<tr>
						<th class="text-right">Commits</th>
						<td
							>{formatNumber(item.repo.commits)}
							<div class="inline-block ml-3">
								<i class="fa-solid fa-check text-green-500" /> <span class="text-sm">Verified</span>
							</div></td
						>
					</tr>
					<tr>
						<th class="text-right">Hash</th>
						<td>{item.repo?.carHash || '-'}</td>
					</tr>
					<tr>
						<th class="text-right">Size</th>
						<td
							>{filesize(item.repo?.size)}
							{#if item.repo?.sizeCompressed}
								({filesize(item.repo.sizeCompressed)} compressed)
							{/if}
						</td>
					</tr>
					<tr>
						<th class="text-right">Records</th>
						<td>{formatNumber(records)} items</td>
					</tr>
					<tr>
						<th class="text-right">Collections</th>
						<td
							>{#if item.repo?.collections && records > 0}
								{Object.keys(item.repo?.collections)
									.map((c) => `${formatNumber(item.repo.collections[c])} ${c}`)
									.join(', ')}{:else}<i>No items</i>{/if}</td
						>
					</tr>
					<tr>
						<th class="text-right">Indexed</th>
						<td>{dateDistance(item.repo?.time)} ago ({item.repo?.time})</td>
					</tr>
					<tr>
						<th class="text-right">Up to date?</th>
						<td
							>{#if current}
								{#if current.commits.length === 0}
									<i class="fa-solid fa-circle-check text-green-500 mr-1" /> Yes
								{:else}
									<i class="fa-solid fa-circle-xmark text-red-500 mr-1" /> No, {current.commits
										.length} new commits
								{/if}
							{:else}
								{#if currentError}
									Cannot get current status :(
								{:else}
									<span class="italic">Checking current status ..</span>
								{/if}
							{/if}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	{:else}
		<div>No repository info yet.</div>
	{/if}

	<SourceSection {data} model="did" hide="true" />
</BasicPage>
