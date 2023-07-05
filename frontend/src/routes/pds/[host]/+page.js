import { request } from '$lib/api';

export async function load({ params, fetch }) {
	return {
		item: request(fetch, `/pds/${params.host}`),
		dids: request(fetch, `/dids?q=pds:${params.host}&limit=10`, {
			headers: { 'x-ats-wrapped': 'true' }
		})
	};
}
