import pkg from '../../package.json';
import * as _ from 'lodash';

import { env } from '$env/dynamic/private';

export async function load({ fetch }) {
	const config = {
		name: env.ATSCAN_NAME,
		domain: env.ATSCAN_DOMAIN,
		api: env.ATSCAN_FE_API,
		web: env.ATSCAN_FE_WEB,
		git: env.ATSCAN_GIT,
		status: env.ATSCAN_STATUS
	};

	const res = await fetch(`${config.api}/plc`);
	const plc = _.orderBy(await res.json(), ['code'], ['asc']);
	return {
		pkg,
		plc,
		config
	};
}
