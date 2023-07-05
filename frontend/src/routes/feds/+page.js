import { request } from '$lib/api';

export async function load({ fetch }) {
	return {
		plc: request(fetch, '/plc')
	};
}
