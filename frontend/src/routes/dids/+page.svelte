<script>
	import { ProgressRadial, SlideToggle } from '@skeletonlabs/skeleton';
	import { formatNumber } from '$lib/utils.js';
	import { goto, invalidate } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import DIDTable from '$lib/components/DIDTable.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';
	import { nats, connected, codec } from '$lib/sockets.js';

	export let data;
	const search = writable(data.q?.trim() || '');
	$: sourceData = data.did;
	$: totalCount = data.totalCount;
	let onlySandbox = data.onlySandbox || null;
	let sort = data.sort || null;

	function sandboxToggleHandler() {
		sourceData = null;
		gotoNewTableState();
	}

	let periodicUpdate = null;
	const subscriptions = [];

	function subscribeDIDs() {
		const sub = nats.subscribe('ats.api.did.*');
		subscriptions.push(sub);
		(async () => {
			for await (const m of sub) {
				//console.log(`[${sub.getProcessed()}x]: ${JSON.stringify(m.data)}`);
				switch (m.subject) {
					case 'ats.api.did.update':
					case 'ats.api.did.create':
						const did = codec.decode(m.data);
						const type = m.subject.replace(/^ats.api.did\./, '');
						did._isChange = type;

						if (m.subject === 'ats.api.did.create' && onlySandbox && did.fed === 'sandbox') {
							totalCount += 1;
							$: sourceData = [did, ...sourceData].slice(0, 100);
						} else if (m.subject === 'ats.api.did.create' && !data.q && !sort && !onlySandbox) {
							totalCount += 1;
							$: sourceData = [did, ...sourceData].slice(0, 100);
						} else {
							const exist = sourceData.find((i) => i.did === did.did);
							if (exist) {
								const index = sourceData.indexOf(exist);
								$: sourceData = [
									...sourceData.slice(0, index),
									did,
									...sourceData.slice(index + 1)
								];
							}
						}
						setTimeout(() => {
							$: sourceData = sourceData.map((sd) => {
								if (sd.did === did.did) {
									did._isChange = false;
								}
								return sd;
							});
						}, 2000);
						break;
				}
			}
			console.log('subscription closed');
		})();
	}

	connected.subscribe((val) => {
		if (val === true) {
			subscribeDIDs();
		}
	});

	onMount(() => {
		/*periodicUpdate = setInterval(() => {
			invalidate((url) => url.pathname === '/dids');
		}, 60 * 1000);*/
	});
	onDestroy(() => {
		clearInterval(periodicUpdate);
		for (const sub of subscriptions) {
			sub.unsubscribe();
		}
	});

	function gotoNewTableState() {
		let q = $search || '';
		if (onlySandbox && !q.match(/fed:sandbox/)) {
			q += ' fed:sandbox';
			q = q.trim();
		} else {
			q = q.replace(/fed:sandbox/, '');
		}
		q = q.trim();
		let args = [];
		if (q) {
			args.push(`q=${q}`);
		}
		if (sort && !(args.length === 0 && sort === '!lastMod')) {
			args.push(`sort=${sort}`);
		}

		const path = '/dids' + (args.length > 0 ? '?' + args.join('&') : '');
		const currentPath = $page.url.pathname + $page.url.search;
		if (currentPath === path) {
			return null;
		}
		goto(path, { keepFocus: true, noScroll: true });
	}

	let lastWrite = null;
	search.subscribe((val) => {
		if (val?.trim() === data.q) {
			return val;
		}

		sourceData = null;
		const current = new Date();
		lastWrite = current;
		setTimeout(
			() => {
				if (lastWrite === current) {
					gotoNewTableState();
				}
			},
			!$search ? 0 : 350
		);
		return val;
	});

	function formSubmit() {
		console.log(search);
	}

	function selectionHandler(i) {
		return goto(`/${i.detail[0]}`);
	}

	function onHeadSelected(e) {
		sourceData = null;
		sort = sort === e.detail ? (sort.startsWith('!') ? '' : '!') + e.detail : e.detail;
		gotoNewTableState();
	}
</script>

<BasicPage {data} title="DIDs">
	<form on:submit|preventDefault={formSubmit} class="flex gap-4">
		<div class="flex w-full gap-4 items-center justify-center">
			<div class="grow">
				<input
					class="input"
					title="Input (text)"
					type="text"
					placeholder="Search for DID .."
					bind:value={$search}
					autocomplete="off"
					spellcheck="false"
					autocorrect="off"
				/>
			</div>
			<div class="flex items-center gap-2">
				<div>Only Sandbox</div>
				<SlideToggle
					name="slide"
					bind:checked={onlySandbox}
					on:change={sandboxToggleHandler}
					active="bg-ats-fed-sandbox dark:bg-ats-fed-sandbox"
				/>
			</div>
		</div>
		<!--button type="submit" class="btn variant-filled">Search</button-->
	</form>
	{#if sourceData === null}
		<div class="flex justify-center items-center">
			<div class="justify-center items-center">
				<div class="text-center mb-6 text-lg">
					{#if $search}
						Searching for <code class="code text-xl">{$search}</code>
						{#if onlySandbox} (only sandbox){/if}...
					{:else}
						Looking for latest DIDs ...
					{/if}
				</div>
				<div class="flex justify-center">
					<ProgressRadial />
				</div>
			</div>
		</div>
	{:else}
		<div class="text-xl">
			{#if $search && $search?.trim() !== ''}
				Search for <code class="code text-xl variant-tertiary">{$search.trim()}</code>
				{#if onlySandbox}(only sandbox){/if} ({formatNumber(totalCount)}):
			{:else}
				All DIDs {#if onlySandbox} on sandbox{/if} ({formatNumber(totalCount)}):
			{/if}
		</div>
		<DIDTable {sourceData} {data} sorting="true" on:headSelected={(e) => onHeadSelected(e)} />
	{/if}
</BasicPage>
