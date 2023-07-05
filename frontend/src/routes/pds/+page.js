import { browser } from '$app/environment';

async function loadPDS(config) {
	const res = await fetch(`${config.api}/pds`);
	return res.json();
}

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent, url }) {
	const { config } = await parent();

	let q = url.searchParams.get('q');
	let sort = url.searchParams.get('sort');

	const pds = loadPDS(config);

	return {
		pds: browser ? pds : await pds,
		sort,
		q
	};
}
