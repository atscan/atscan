import { request } from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	let q = url.searchParams.get('q');
	let sort = url.searchParams.get('sort');

	if (!q && !sort) {
		sort = '!size';
	}

	const args = ['limit=15'];
	if (q) {
		args.push(`q=${q}`);
	}
	if (sort) {
		args.push(`sort=${sort}`);
	}

	const res = await request(fetch, '/dids' + (args.length > 0 ? '?' + args.join('&') : ''), {
		headers: { 'x-ats-wrapped': 'true' }
	});
	//console.log(res.totalCount)

	return {
		items: res.items,
		totalCount: res.count,
		q,
		sort
	};
}
