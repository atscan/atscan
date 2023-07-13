import { persisted } from 'svelte-local-storage-store';

export const preferences = persisted('preferences', {
	favoritePDS: [],
	pdsShowMap: true
});
