import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { load } from 'js-yaml';
import { readFileSync } from 'fs';

//const config = load(await readFileSync('../config.yaml', 'utf-8'))

export default defineConfig({
	plugins: [sveltekit()]
});
