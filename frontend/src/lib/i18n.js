import i18next from 'i18next';
import { createI18nStore } from 'svelte-i18next';

i18next.init({
	lng: 'en',
	resources: {
		en: {
			translation: {}
		}
	},
	interpolation: {
		escapeValue: true
	},
	// allow keys to be phrases having `:`, `.`
	nsSeparator: false,
	keySeparator: false,

	// do not load a fallback
	fallbackLng: false
});

export const i18n = createI18nStore(i18next);
