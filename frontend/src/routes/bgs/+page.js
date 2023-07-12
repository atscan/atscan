import { request } from '$lib/api';

export async function load({ fetch }) {
	return {
		bgs: request(fetch, '/bgs')
	};
}
