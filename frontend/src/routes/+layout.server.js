import pkg from '../../package.json';

export async function load({ fetch }) {
	const config = {
		name: 'ATScan',
		domain: 'atscan.net',
		api: 'https://api.atscan.net',
		web: 'https://atscan.net',
		git: 'https://github.com/atscan/atscan',
		status: 'https://status.gwei.cz/status/atscan',
		ecosystem: 'https://ecosystem.atscan.net/index.json'
	};

	const ecosystemRes = await fetch(config.ecosystem);
	const ecosystem = ecosystemRes ? await ecosystemRes.json() : null;

	return {
		config,
		ecosystem,
		pkg
	};
}
