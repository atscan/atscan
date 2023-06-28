import pkg from '../../package.json';
import * as _ from 'lodash';

export async function load({ fetch }) {
	const res = await fetch('https://api.atscan.net/plc');
	const plc = _.orderBy(await res.json(), ['code'], ['asc']);
	return {
		pkg,
		plc
	};
}
