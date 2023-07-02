import * as _ from 'lodash';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	const { config } = await parent();
	let q = url.searchParams.get('q');
	let sort = url.searchParams.get('sort');

	const args = [];
	if (q) {
		args.push(`q=${q}`);
	}
	if (sort) {
		args.push(`sort=${sort}`);
	}
	const res = await fetch(`${config.api}/dids` + (args.length > 0 ? '?' + args.join('&') : ''), {
		headers: { 'x-ats-wrapped': 'true' }
	});
	const json = await res.json();
	let onlySandbox = false;
	if (q?.match(/fed:sandbox/)) {
		onlySandbox = true;
		q = q.replace('fed:sandbox', '').trim();
	}
	return {
		did: json.items,
		totalCount: json.count,
		q,
		sort,
		onlySandbox
	};
}
