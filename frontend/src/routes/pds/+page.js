import * as _ from 'lodash';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent, url }) {
	const { config } = await parent();
	const res = await fetch(`${config.api}/pds`);
	const arr = (await res.json()).map((i) => {
		i.err = Boolean(i.inspect?.current?.err);
		return i;
	});
	//const pds = _.orderBy(arr, ['env', 'err', 'didsCount'], ['asc', 'asc', 'desc']);
	let q = url.searchParams.get('q');
	let sort = url.searchParams.get('sort');
	return {
		pds: arr,
		sort,
		q
	};
}
