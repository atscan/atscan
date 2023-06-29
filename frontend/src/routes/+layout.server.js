import pkg from '../../package.json';

export async function load({ fetch }) {
	const config = {
		name: 'ATScan',
		domain: 'atscan.net',
		api: 'https://api.atscan.net',
		web: 'https://atscan.net',
		git: 'https://github.com/atscan/atscan',
		status: 'https://status.gwei.cz/status/atscan',
		ecosystem: 'https://mirror.ecosystem.atscan.net/index.json'
	};

	const ecosystemRes = await fetch(config.ecosystem);
	const ecosystem = ecosystemRes ? await ecosystemRes.json() : null;

	return {
		config,
		ecosystem,
		pkg,
		basicSpacing: 'p-4 md:p-4 space-y-6 md:space-y-6'
	};
}
