<script>
	// The ordering of these imports is critical to your app working properly
	import '@skeletonlabs/skeleton/themes/theme-rocket.css';
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/skeleton.css';
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';
	import { AppShell, AppBar, LightSwitch } from '@skeletonlabs/skeleton';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	import hljs from 'highlight.js';
	import 'highlight.js/styles/github-dark.css';
	import { storeHighlightJs } from '@skeletonlabs/skeleton';
	import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import { i18n } from '$lib/i18n.js';
	import { nats, connect, connected } from '$lib/sockets.js';
	import { navigating } from '$app/stores';
	import { ProgressBar } from '@skeletonlabs/skeleton';

	export let data;

	storeHighlightJs.set(hljs);

	onMount(() => {
		connect();
	});

	afterNavigate(() => {
		//console.log('scrolltop');
		//window.scrollTo(0, 0);
	});

	function drawerOpen() {
		drawerStore.open({});
	}

	const navigationMaps = [
		[
			{ title: 'DIDs', url: '/dids' },
			{ title: 'PDS Instances', url: '/pds' },
			{ title: 'Federations', url: '/feds' }
		],
		[
			{ title: 'API', url: '/api' },
			{ title: 'AT Protocol', url: 'https://atproto.com/', external: true }
		]
	];
</script>

<svelte:head>
	<title>{data.config.name}</title>
	<script defer data-domain={data.config.domain} src="https://x.gwei.cz/js/script.js"></script>
</svelte:head>

<Drawer width="w-[75%]">
	<h2 class="p-4">
		<a href="/"
			><strong class="text-xl ml-4 font-bold text-gray-600 dark:text-gray-300"
				><span class="text-[#3d81f8]">AT</span>Scan</strong
			></a
		>
	</h2>
	<hr />
	{#each navigationMaps as navMap}
		<nav class="list-nav p-4">
			<!-- (optionally you can provide a label here) -->
			<ul>
				{#each navMap as ni}
					<li>
						<a
							href={ni.url}
							on:click={() => !ni.external && drawerStore.close()}
							target={ni.external ? '_blank' : ''}
						>
							<span class="flex-auto" class:external={ni.external}>{ni.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<hr />
	{/each}
	<div class="p-4">
		<a
			class="btn btn-sm hover:variant-soft-primary icon"
			href={data.config.git}
			target="_blank"
			rel="noreferrer"
		>
			<i class="fa-brands fa-github" /> <span class="text-sm">v{data.pkg.version}</span>
		</a>
	</div>
</Drawer>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<div class="h-1.5 bg-surface-100-800-token">
			{#if $navigating}
				<div class="w-full">
					<ProgressBar meter="bg-primary-500" track="bg-surface-100-800-token" />
				</div>
			{/if}
		</div>
		<!-- App Bar -->
		<AppBar padding="px-4 pb-4 pt-2.5">
			<svelte:fragment slot="lead">
				<div class="flex items-center">
					<button class="lg:hidden btn btn-sm" on:click={drawerOpen}>
						<span>
							<svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
								<rect width="100" height="20" />
								<rect y="30" width="100" height="20" />
								<rect y="60" width="100" height="20" />
							</svg>
						</span>
					</button>
				</div>
				<a href="/"
					><strong class="text-xl ml-4 font-bold text-gray-600 dark:text-gray-300"
						><span class="text-[#3d81f8]">AT</span>Scan</strong
					></a
				>
				<div class="lg:ml-8 flex gap-1">
					<div class="relative hidden lg:block">
						<a
							href="/dids"
							class="btn hover:variant-soft-primary"
							class:bg-primary-active-token={$page.url.pathname.startsWith('/dids')}
							><span>{$i18n.t('DIDs')}</span></a
						>
					</div>
					<div class="relative hidden lg:block">
						<a
							href="/pds"
							class="btn hover:variant-soft-primary"
							class:bg-primary-active-token={$page.url.pathname.startsWith('/pds')}
							><span>{$i18n.t('PDS Instances')}</span></a
						>
					</div>
					<div class="relative hidden lg:block">
						<a
							href="/feds"
							class="btn hover:variant-soft-primary"
							class:bg-primary-active-token={$page.url.pathname === '/feds'}
							><span>Federations</span></a
						>
					</div>
					<!--div class="relative hidden lg:block">
						<a
							href="/clients"
							class="btn hover:variant-soft-primary"
							class:bg-primary-active-token={$page.url.pathname === '/clients'}
							><span>Clients</span></a
						>
					</div-->
				</div>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<!--
				<a
					class="btn btn-sm variant-ghost-surface"
					href="https://discord.gg/EXqV7W8MtY"
					target="_blank"
					rel="noreferrer"
				>
					Discord
				</a>
				<a
					class="btn btn-sm variant-ghost-surface"
					href="https://twitter.com/SkeletonUI"
					target="_blank"
					rel="noreferrer"
				>
					Twitter
				</a>
				-->
				{#if $connected}
					<div class="text-xs pr-4">
						<i class="fa-solid fa-circle text-green-500 text-xs mr-1 animate-pulse" /> Connected
					</div>
				{/if}
				<LightSwitch />
				<div class="relative hidden lg:block">
					<a
						href="/api"
						class="btn hover:variant-soft-primary"
						class:bg-primary-active-token={$page.url.pathname === '/api'}><span>API</span></a
					>
				</div>

				<a
					class="btn btn-sm hover:variant-soft-primary icon hidden lg:block"
					href={data.config.git}
					target="_blank"
					rel="noreferrer"
				>
					<i class="fa-brands fa-github" /> <span class="text-sm">v{data.pkg.version}</span>
				</a>
				<a
					class="btn btn-sm variant-ghost-surface hover:variant-soft-primary external hidden lg:block"
					href="https://atproto.com/"
					target="_blank"
					rel="noreferrer"
				>
					AT Protocol
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
	<!--svelte:fragment slot="footer">
	</svelte:fragment-->
</AppShell>
