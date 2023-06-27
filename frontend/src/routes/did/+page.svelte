<script>
    import { Table } from '@skeletonlabs/skeleton';
	import { tableMapperValues, tableSourceValues, ProgressBar, ProgressRadial, SlideToggle } from '@skeletonlabs/skeleton';
    import { dateDistance, identicon, formatNumber } from '$lib/utils.js';
    import { goto, beforeNavigate, afterNavigate, invalidate } from '$app/navigation';
    import { writable } from 'svelte/store';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    
    export let data;
	const search = writable(data.q || '')
    $: sourceData = data.did;
    let onlySandbox = data.onlySandbox || null
    let initialSetupOnlySandbox = null

    function sandboxToggleHandler() {
        sourceData = null
        gotoNewTableState()
    }

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

    function tableMapperValuesLocal (source, keys) {
		return tableSourceValues(source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => { 
				let val = row[key]
                if (key === 'world') {
                }
                if (key === 'srcHost') {
                    val = `<a href="/plc/${val}" class="hover:underline">${val}</a>`
                }
                if (key === 'pds') {
                    const host = 
                    val = val.map(i => {
                        const host = i.replace(/^https?:\/\//, '')
                        return `<a href="/pds/${host}" class='hover:underline'>${host}</a>`
                    }).join(', ')
                }
                if (key === 'did') {
                    const did = val
                    const plc = data.plc.find(i => i.url === row.src)
                    val = `<div class="flex gap-6">`
                    val += `    <div>`
                    val += `        <div class="text-lg inline-block"><a href="/${did}" class="hover:underline"><span class="opacity-50">did:plc:</span><span class="font-semibold opacity-100">${did.replace(/^did:plc:/, '')}</span></a></div>`
                    const handles = row.revs[row.revs.length-1].operation.alsoKnownAs.filter(h => !h.match(/at:\/\/data:x\//)).map(h => h.replace(/^at:\/\//, ''))
                    val += `        <div class="mt-1.5">`
                    val += `            <span class="mr-2 badge text-xs variant-filled ${plc.color} dark:${plc.color} opacity-70 text-white dark:text-black">${plc.name}</span>`
                    val += `            <span>${handles.map(h => `<a href="https://bsky.app/profile/${h}" target="_blank" class="hover:underline">@${h}</a>`).join(', ')}</span>`
                    val += `        </div>`
                    val += `    </div>`
                    val += "</div>"
                }
                if (key === 'time') {
                    val = dateDistance(val)
                }
                if (key === 'deep') {
                    val = row.revs.length
                }
                if (key === 'img') {
                    val = `<div class="text-right w-full"><div class="inline-block"><a href="/${row.did}"><img src="${identicon(row.did)}" class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 float-left" /></a></div></div>`
                }

                return mappedRow[key] = val
		    })
		    return mappedRow;
        }))
    }
    $: tableSimple = {
        // A list of heading labels.
        head: ['', 'DID', '#', 'PLC', 'PDS', 'Last mod'],
        body: tableMapperValuesLocal(sourceData || [], ['img', 'did', 'deep', 'srcHost', 'pds', 'time']),
        meta: tableMapperValues(sourceData || [], ['did']),
    };

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
            {#if $search}
                Search for <code class="code text-2xl">{$search}</code> {#if onlySandbox}(only sandbox){/if} ({formatNumber(data.totalCount)}):
            {:else}
                All DIDs ({formatNumber(data.totalCount)}):
            {/if}
        </div>
	    <Table source={tableSimple} interactive={true} on:selected={selectionHandler} />
    {/if}
</div>