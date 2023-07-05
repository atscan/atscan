import { config } from '$lib/config';

export let ecosystem = null;

export async function loadEcosystem() {
	if (ecosystem) {
		return ecosystem;
	}
	const ecosystemRes = await fetch(config.ecosystem);
	ecosystem = ecosystemRes ? await ecosystemRes.json() : null;
	return ecosystem;
}
