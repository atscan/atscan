//import { fetch } from 'svelte/fetch';
import { config } from '$lib/config';

export async function request(fetch, path, ...args) {
	console.log(path);
	const res = await fetch(config.api + path, ...args);
	if (!res || res.status !== 200) {
		return null;
	}
	return res.json();
}
