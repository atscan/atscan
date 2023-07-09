import { formatDistanceToNow } from 'date-fns';
import { minidenticon } from 'minidenticons';
import { tableSourceValues } from '@skeletonlabs/skeleton';
import numbro from 'numbro';
import { filesize as _filesize } from 'filesize';
import { config } from '$lib/config';

export function dateDistance(date) {
	return formatDistanceToNow(new Date(date));
}

export function identicon(...args) {
	return 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(...args));
}

numbro.setDefaults({
	thousandSeparated: true
	//mantissa: 2
});
export function formatNumber(number) {
	return numbro(number).format();
}

export function customTableMapper(source, keys, process) {
	return tableSourceValues(
		source.map((row) => {
			const mappedRow = {};
			keys.forEach((key) => {
				let val = row[key];
				val = process({ row, key, val });
				return (mappedRow[key] = val);
			});
			return mappedRow;
		})
	);
}

export function getFlagEmoji(countryCode) {
	const codePoints = countryCode
		.toUpperCase()
		.split('')
		.map((char) => 127397 + char.charCodeAt());
	return String.fromCodePoint(...codePoints);
}

export function getDIDProfileUrl(fed, item) {
	const base = 'https://bsky.app';
	if (fed && fed.app) {
		return `${fed.app}/profile/${item.did}`;
	}
	return `${base}/profile/${item.did}`;
}

export function filesize(size) {
	return _filesize(size);
}

export function isDarkMode(document) {
	const elemHtmlClasses = document.documentElement.classList;
	return elemHtmlClasses.contains('dark');
}

export function getPDSStatus(row) {
	const [color, ico, text] =
		row.status === 'unknown'
			? ['text-gray-500', null, 'Status unknown']
			: row.status === 'degraded'
			? ['text-orange-500', null, 'Partially degraded']
			: row.status === 'offline'
			? ['text-red-500', null, 'Offline']
			: ['text-green-500', null, 'Online'];

	return { color, ico, text };
}

export function blobUrl(did, cid) {
	return `${config.blobApi}/${did}/${cid}`;
}
