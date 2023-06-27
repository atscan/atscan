<script>
    import DIDTable from '$lib/components/DIDTable.svelte';
	import { ProgressRadial, SlideToggle } from '@skeletonlabs/skeleton';
    import { formatNumber } from '$lib/utils.js';
    import { goto, beforeNavigate, afterNavigate, invalidate } from '$app/navigation';
    import { writable } from 'svelte/store';
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    
    export let data;
	const search = writable(data.q?.trim() || '')
    $: sourceData = data.did;
    let onlySandbox = data.onlySandbox || null
    let initialSetupOnlySandbox = null

    function sandboxToggleHandler() {
        sourceData = null
        gotoNewTableState()
    }
    
    let periodicUpdate = null
    onMount(() => {
        periodicUpdate = setInterval(() => {
            invalidate((url) => url.pathname === '/did');
        }, 60 * 1000)
    })
    onDestroy(() => {
        clearInterval(periodicUpdate)
    })

    function gotoNewTableState () {
        let q = $search || '' 
        if (onlySandbox && !q.match(/env:sbox/)) {
            q += " env:sbox"
            q = q.trim()
        } else {
            q = q.replace(/env:sbox/, '')
        }
        q = q.trim()
		const path = '/did' + (q !== '' ? `?q=${q}` : '')
		const currentPath = $page.url.pathname + $page.url.search
		if (currentPath === path) {
			return null
		}
		goto(path, { keepFocus: true, noScroll: true })
	}

    let lastWrite = null
	search.subscribe((val) => {
        if (val?.trim() === data.q) {
            return val
        }

        sourceData = null
        const current = new Date()
        lastWrite = current
        setTimeout(() => {
            if (lastWrite === current) {
                gotoNewTableState()
            }
        }, !$search ? 0 : 350)
		return val
	})

    function formSubmit () {
        console.log(search)
    }

    function selectionHandler (i) {
        return goto(`/${i.detail[0]}`)
    }

</script>

<svelte:head>
	<title>DIDs | ATScan</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">DIDs</h1>
    <form on:submit|preventDefault={formSubmit} class="flex gap-4">
        <div class="flex w-full gap-4 items-center justify-center">
            <div class="grow">
                <input class="input" title="Input (text)" type="text" placeholder="Search for DID .." bind:value={$search} autocomplete='off' spellcheck='false' autocorrect='off' />
            </div>
            <div class="flex items-center gap-2">
                <div>Only Sandbox</div>
                <SlideToggle name="slide" bind:checked={onlySandbox} on:change={sandboxToggleHandler} active="bg-ats-sbox dark:bg-ats-sbox" />
            </div>
        </div>
		<!--button type="submit" class="btn variant-filled">Search</button-->
    </form>
    {#if sourceData === null}
        <div class="flex justify-center items-center">
            <div class="justify-center items-center">
                <div class="text-center mb-6 text-lg">
                    {#if $search}
                        Searching for <code class="code text-xl">{$search}</code> {#if onlySandbox} (only sandbox){/if}...
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
            {#if $search && $search?.trim() !== ""}
                Search for <code class="code text-2xl">{$search.trim()}</code> {#if onlySandbox}(only sandbox){/if} ({formatNumber(data.totalCount)}):
            {:else}
                All DIDs ({formatNumber(data.totalCount)}):
            {/if}
        </div>
	    <DIDTable {sourceData} {data} />
    {/if}
</div>