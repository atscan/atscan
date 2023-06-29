<script>
	import { customTableMapper } from '$lib/utils.js';
	import Table from '$lib/components/Table.svelte';
	import BasicPage from '$lib/components/BasicPage.svelte';

	export let data;

	const platformMap = {
		ios: { title: 'iOS' },
		android: { title: 'Android' },
		macos: { title: 'macOS' },
		web: { title: 'Web' },
		cli: { title: 'CLI' }
	};

	const langMap = {
		js: { title: 'JavaScript' },
		kotlin: { title: 'Kotlin' },
		go: { title: 'Go' }
	};

	function tableMap({ val, key, row }) {
		if (key === 'name') {
			val = `<span class="text-lg font-semibold">${val}</span>`;
		}
		if (key === 'platforms') {
			val = [...new Set(row.apps.map((a) => platformMap[a.platform]?.title || a.platform))].join(
				', '
			);
			val +=
				'<br /><span class="text-xs">' +
				[...new Set(row.apps.map((a) => langMap[a.language]?.title || a.language))].join(', ') +
				'</span>';
		}
		if (key === 'links') {
			val = row.links?.git
				? `<a href="${row.links.git}" class="anchor text-lg" target="_blank"><i class="fa-brands fa-github"></i></a>`
				: '';
		}
		if (key === 'authors') {
			val = val
				.map((p) => `<a href="${p.links?.bsky}" class="anchor" target="_blank">${p.name}</a>`)
				.join(', ');
		}
		if (key === 'popularity') {
			val =
				'<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i>';
		}
		if (key === 'url_raw') {
			val = `/client/${row.id}`;
		}
		return val;
	}

	const tableSimple = {
		// A list of heading labels.
		head: ['Name', 'Platforms', 'Authors', 'Links', 'Popularity'],
		body: customTableMapper(
			data.ecosystem.data.clients,
			['name', 'platforms', 'authors', 'links', 'popularity'],
			tableMap
		),
		meta: customTableMapper(data.ecosystem.data.clients, ['id', 'url_raw'], tableMap)
	};
</script>

<BasicPage {data} title="Clients">
	<Table source={tableSimple} />
</BasicPage>
