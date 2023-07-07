import { error, redirect } from '@sveltejs/kit';
import { request } from '$lib/api';

export async function load({ params, fetch, parent }) {
	const { config } = await parent();
	const did = params.id;
	const item = await request(fetch, `/${did}`);
	if (!item) {
		throw error(404, { message: 'Not found' });
	}
	if (item.did !== did) {
		throw redirect(302, `/${item.did}`);
	}
	const pdsHost = item.pds[0]?.replace(/^https?:\/\//, '');
	const pdsRes = pdsHost ? await fetch(`${config.api}/pds/${pdsHost}`) : null;
	return {
		item,
		pds: pdsRes ? [await pdsRes.json()] : [],
		did
	};
}
