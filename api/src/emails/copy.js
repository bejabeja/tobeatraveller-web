import { resolveLanguage } from '../utils/languages.js';
import { de } from './locales/de.js';
import { en } from './locales/en.js';
import { es } from './locales/es.js';
import { fr } from './locales/fr.js';
import { it } from './locales/it.js';

const COPY = { en, es, fr, it, de };

// The copy of the emails in `language`, or in the default language when it
// isn't known (users from before it was saved) or isn't supported.
export const emailCopy = (language) => {
    const resolved = resolveLanguage(language);
    return { language: resolved, ...COPY[resolved] };
};
