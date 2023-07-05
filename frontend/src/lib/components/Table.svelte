<script>
	import { createEventDispatcher } from 'svelte';
	import { tableA11y } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	// Props
	/**
	 * Provide the full set of table source data.
	 * @type {TableSource}
	 */
	export let source;

	export let currentSort = null;
	export let defaultSort = null;
	export let favoriteColumn = null;
	export let sorting = false;

	if (!currentSort) {
		currentSort = defaultSort;
	}

	/** Enables row hover style and `on:selected` event when rows are clicked. */
	export let interactive = false;
	export let interactiveOnlyHover = true;

	// Props (styles)
	/** Override the Tailwind Element class. Replace this for a headless UI. */
	export let element = 'table';
	/** Provide classes to set the table text size. */
	export let text = '';
	/** Provide classes to set the table text color. */
	export let color = '';
	/** Provide arbitrary classes for the table head. */
	export let regionHead = '';
	/** Provide arbitrary classes for the table head cells. */
	export let regionHeadCell = '';
	/** Provide arbitrary classes for the table body. */
	export let regionBody = '';
	/** Provide arbitrary classes for the table cells. */
	export let regionCell = '';
	/** Provide arbitrary classes for the table foot. */
	export let regionFoot = '';
	/** Provide arbitrary classes for the table foot cells. */
	export let regionFootCell = '';

	// Row Click Handler
	function onRowClick(event, rowIndex) {
		if (interactive) {
			event.preventDefault();
			event.stopPropagation();
			// Prefer meta row info if available, else fallback to body row info
			const rowMetaData = source.meta ? source.meta[rowIndex] : source.body[rowIndex];
			/** @event {rowMetaData} selected - Fires when a table row is clicked. */
			dispatch('selected', rowMetaData);
		}
		if (event.target.nodeName !== 'A' && !event.target.parentElement.nodeName !== 'A') {
			event.preventDefault();
			const rowMetaData = source.meta ? source.meta[rowIndex] : source.body[rowIndex];
			const url = rowMetaData[1];
			if (url) {
				goto(url);
			}
		}
	}

	function onHeaderClick(event, meta) {
		dispatch('headSelected', meta);
	}

	function onFavoriteClick(event, id) {
		event.preventDefault();
		event.stopPropagation();
		dispatch('favoriteClick', id);
	}

	// Row Keydown Handler
	function onRowKeydown(event, rowIndex) {
		if (['Enter', 'Space'].includes(event.code)) onRowClick(event, rowIndex);
	}

	// Reactive
	$: classesBase = `${$$props.class || ''}`;
	$: classesTable = `${element} ${text} ${color}`;
</script>

<div class="table-container {classesBase}">
	<!-- Table -->
	<!-- prettier-ignore -->
	<table
		class="{classesTable}"
		class:table-interactive={interactive || interactiveOnlyHover}
		role="grid"
		use:tableA11y
	>
		<!-- on:keydown={(e) => onTableKeydown(elemTable, e)} -->
		<!-- Head -->
		<thead class="table-head {regionHead}">
			<tr>
				{#each source.head as heading}
					<th class="{regionHeadCell} {sorting ? 'cursor-pointer hover:underline' : ''} text-sm"
							on:click={(e) => { onHeaderClick(e, Array.isArray(heading) ? heading[1] : heading) }}>
						{@html Array.isArray(heading) ? heading[0] : heading}
						{#if sorting && Array.isArray(heading) && (currentSort?.replace(/^!/, '') === heading[1] || '!'+currentSort === heading[1])}
							{#if currentSort?.startsWith('!')}
								↑
							{:else}
								↓
							{/if}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<!-- Body -->
		<tbody class="table-body {regionBody}">
			{#each source.body as row, rowIndex}
				<!-- Row -->
				<!-- prettier-ignore -->
				<tr
					id={source.meta[rowIndex][0]}
					on:click={(e) => { onRowClick(e, rowIndex); }}
					on:keydown={(e) => { onRowKeydown(e, rowIndex); }}
					aria-rowindex={rowIndex + 1}
				>
					{#each row as cell, cellIndex}
						<!-- Cell -->
						<!-- prettier-ignore -->
						<td
							class="{source.meta[rowIndex][2] === 'update' ? 'bg-yellow-500/50' : (source.meta[rowIndex][2] === 'create' ? 'bg-green-500/50' : '')} transition-all duration-[2500ms] ease-out {regionCell}"
							role="gridcell"
							aria-colindex={cellIndex + 1}
							tabindex={cellIndex === 0 ? 0 : -1}
						>
							{@html cell ? cell : '-'}
							{#if favoriteColumn !== null && favoriteColumn === cellIndex}
								<i class="favorite fa-regular fa-star ml-1 {source.meta[rowIndex][3] !== undefined && source.meta[rowIndex][3] ? 'inline-block active text-yellow-500 opacity-100 hover:text-red-500' : 'opacity-50 hidden hover:text-green-500'} hover:opacity-100" on:click={(ev) => onFavoriteClick(ev, source.meta[rowIndex][0])}></i>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
		<!-- Foot -->
		{#if source.foot}
			<tfoot class="table-foot {regionFoot}">
				<tr>
					{#each source.foot as cell }
						<td class="{regionFootCell}">{@html cell}</td>
					{/each}
				</tr>
			</tfoot>
		{/if}
	</table>
</div>

<style>
	.table-body tr td .favorite {
		display: none;
	}
	.table-body tr:hover td .favorite {
		display: inline-block;
	}
</style>
