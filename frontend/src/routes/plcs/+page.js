import { request } from '$lib/api';

export async function load({ fetch }) {
	return {
		plcs: request(fetch, '/plcs')
	};
}
