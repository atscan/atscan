import { request } from '$lib/api';

export async function load({ params, fetch }) {
	return {
		item: request(fetch, `/bgs/${params.host}`)
	};
}
