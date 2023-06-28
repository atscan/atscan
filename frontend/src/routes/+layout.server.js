import pkg from '../../package.json';
import * as _ from 'lodash';

import { env } from '$env/dynamic/private';

export async function load({ fetch }) {

	const config = {
		name: 'ATScan',
		domain: 'atscan.net',
		api: 'https://api.atscan.net',
		web: 'https://atscan.net',
		git: 'https://github.com/atscan/atscan',
		status: 'https://status.gwei.cz/status/atscan',
	};

	const res = await fetch(`${config.api}/plc`);
	const plc = _.orderBy(await res.json(), ['code'], ['asc']);
	return {
		pkg,
		plc,
		config
	};
}
