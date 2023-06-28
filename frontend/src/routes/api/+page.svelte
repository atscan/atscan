<script>
	import { CodeBlock, clipboard, dataTableHandler } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues } from '@skeletonlabs/skeleton';
	import Table from '$lib/components/Table.svelte';
	import { customTableMapper } from '$lib/utils.js';

	export let data;

	const sourceData = [
		{
			path: '/did',
			desc: 'Get all DIDs',
			example: ['/did', '/did?q=pds:bsky.social', '/did?q=.cz$']
		},
		{ path: '/[did]', desc: 'Get DID item', example: ['/did:plc:524tuhdhh3m7li5gycdn6boe'] },
		{ path: '/pds', desc: 'Get all PDS Instances', example: ['/pds', '/pds?q=gwei.cz'] },
		{ path: '/pds/[id]', desc: 'Get PDS item', example: ['/pds/bsky.social'] },
		{ path: '/plc', desc: 'Get all PLC Directories', example: ['/plc'] }
	];

	$: tableSimple = {
		head: ['Method', 'Path', 'Description', 'Example'],
		body: customTableMapper(
			sourceData,
			['method', 'path', 'desc', 'example'],
			({ val, key, row }) => {
				if (key === 'method') {
					val = `<span class="badge variant-filled-primary">${(val || 'get').toUpperCase()}</span>`;
				}
				if (key === 'path' || key === 'example') {
					val = val || '';
					if (typeof val === 'string') {
						val = [val];
					}
					val = val
						.map((v) => `<code class="code ${key === 'path' ? 'text-lg' : ''}">${v}</code>`)
						.join('<br />');
				}
				return val;
			}
		),
		meta: tableMapperValues(sourceData, ['did'])
	};
</script>

<svelte:head>
	<title>{data.config.name} API</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">{data.config.name} API</h1>

	<aside class="alert variant-filled-warning">
		<!-- Icon -->
		<i class="fa-solid fa-triangle-exclamation text-4xl" />
		<!-- Message -->
		<div class="alert-message">
			<h3 class="h3">Experimental</h3>
			<p>This API is not suitable for production use, it is just an experiment for now.</p>
		</div>
	</aside>

	<p>
		Our API is available at this address:<br /><span class="mt-2 pre text-sm inline-block"
			>{data.config.api}</span
		>
	</p>

	<h3 class="h3">Mirrored paths (web & api)</h3>
	<p>
		Most endpoints mirror the web interface path, so for example the <a
			href="{data.config.api}/did?q=pds:test-pds.gwei.cz"
			class="code">{data.config.api}/did?q=pds:test-pds.gwei.cz</a
		>
		page will list all DIDs on this PDS and the
		<a href="{data.config.api}/did?q=pds:test-pds.gwei.cz" class="code"
			>{data.config.api}/did?q=pds:test-pds.gwei.cz</a
		> page will return the same as JSON.
	</p>

	<h2 class="h2">Endpoints</h2>

	<Table source={tableSimple} />

	<!--CodeBlock code={`http -F {data.config.api}/did
> HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Alt-Svc: h3=":443"; ma=2592000
Content-Encoding: gzip
Content-Length: 917
Content-Type: application/json; charset=UTF-8
Date: Tue, 27 Jun 2023 10:19:11 GMT
Server: Caddy
Vary: Accept-Encoding

{
    "_id": "64981ec3bdfb07c134caf0a4",
    "did": "did:plc:524tuhdhh3m7li5gycdn6boe",
    "env": "bsky",
    "pds": [
        "https://bsky.social"
    ],
    "revs": [
`} language="bash"></CodeBlock!-->

	<h2 class="h2">Status</h2>
	<p>
		To view the status of our services, go to <a
			href={data.config.status}
			target="_blank"
			class="underline hover:no-underline">{data.config.status}</a
		>.
	</p>
</div>
