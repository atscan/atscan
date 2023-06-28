import { join } from 'path';
import skeleton from '@skeletonlabs/skeleton/tailwind/skeleton.cjs';

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}'),
		'../spec/*.yaml'
	],
	theme: {
		extend: {
			colors: {
				'ats-fed-bluesky': '#3399ff',
				'ats-fed-sandbox': '#eab308'
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), ...skeleton()]
};
