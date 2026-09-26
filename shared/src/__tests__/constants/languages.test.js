import { describe, expect, it } from 'vitest';
import { SUPPORTED_APP_LANGUAGES, toAppLanguage } from '../../utils/constants/languages.js';

describe('toAppLanguage', () => {
    it('keeps the language of a regional code the apps have', () => {
        expect(toAppLanguage('fr-FR')).toBe('fr');
        expect(toAppLanguage('it')).toBe('it');
    });

    it('falls back to English for a language the apps do not have, or none', () => {
        expect(toAppLanguage('pt-BR')).toBe('en');
        expect(toAppLanguage(undefined)).toBe('en');
    });

    it('offers every language that has a translation file', () => {
        expect(SUPPORTED_APP_LANGUAGES).toEqual(['es', 'en', 'fr', 'it', 'de']);
    });
});
