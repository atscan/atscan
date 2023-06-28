import { error } from '@sveltejs/kit';

export async function load({ params, fetch, parent }) {
	const data = await parent();

	const item = data.ecosystem.data.clients.find((c) => c.id === params.id);
	if (!item) {
		throw error(404, { message: 'Not found' });
	}
	return {
		item
	};
}
