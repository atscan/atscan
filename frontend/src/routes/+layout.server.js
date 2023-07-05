import pkg from '../../package.json';
import { config } from '$lib/config';
import { loadEcosystem } from '$lib/ecosystem';

export async function load({ fetch }) {
	return {
		config,
		ecosystem: await loadEcosystem(),
		pkg,
		basicSpacing: 'p-4 md:p-4 space-y-6 md:space-y-6'
	};
}
