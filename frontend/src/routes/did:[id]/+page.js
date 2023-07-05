import { error } from '@sveltejs/kit';
import { request } from '$lib/api';

export async function load({ params, fetch, parent }) {
	const { config } = await parent();
	const did = `did:${params.id}`;
	const item = await request(fetch, `/${did}`);
	if (!item) {
		throw error(404, { message: 'Not found' });
	}
	const pdsHost = item.pds[0]?.replace(/^https?:\/\//, '');
	const pdsRes = pdsHost ? await fetch(`${config.api}/pds/${pdsHost}`) : null;
	return {
		item,
		pds: pdsRes ? [await pdsRes.json()] : [],
		did
	};
}
