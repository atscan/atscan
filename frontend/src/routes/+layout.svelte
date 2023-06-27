<script>
	// The ordering of these imports is critical to your app working properly
	import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/skeleton.css';
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';
	import { AppShell, AppBar, LightSwitch } from '@skeletonlabs/skeleton';
	import { afterNavigate } from "$app/navigation";
	import { page } from '$app/stores';

	import hljs from 'highlight.js';
	import 'highlight.js/styles/github-dark.css';
    import { storeHighlightJs } from '@skeletonlabs/skeleton';

	export let data;

	storeHighlightJs.set(hljs);

	afterNavigate(() => {
		console.log('scrolltop');
    	//window.scrollTo(0, 0);
  	});
</script>

<svelte:head>
	<title>ATScan</title>
</svelte:head>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<a href="/"><strong class="text-xl ml-4 font-bold text-gray-600 dark:text-gray-300"><span class="text-[#3d81f8]">AT</span>Scan</strong></a>
				<div class="lg:ml-8 flex gap-1">
					<div class="relative hidden lg:block">
						<a href="/did" class="btn hover:variant-soft-primary" class:bg-primary-active-token={$page.url.pathname === '/did'}><span>DIDs</span></a>
					</div>
					<div class="relative hidden lg:block">
						<a href="/pds" class="btn hover:variant-soft-primary" class:bg-primary-active-token={$page.url.pathname === '/pds'}><span>PDS Instances</span></a>
					</div>
					<div class="relative hidden lg:block">
						<a href="/plc" class="btn hover:variant-soft-primary" class:bg-primary-active-token={$page.url.pathname === '/plc'}><span>PLC Directories</span></a>
					</div>
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
				<div class="text-sm opacity-50">v{data.pkg.version}</div>
				<a
					class="btn btn-sm variant-ghost-surface hover:variant-soft-primary external"
					href="https://atproto.com/"
					target="_blank"
					rel="noreferrer"
				>
					AT Protocol
				</a>
				<a
					class="btn btn-sm variant-ghost-surface hover:variant-soft-primary icon"
					href="https://github.com/atscan/atscan"
					target="_blank"
					rel="noreferrer"
				>
					<i class="fa-brands fa-github"></i>
				</a>
				<LightSwitch />
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>

