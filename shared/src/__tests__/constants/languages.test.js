import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { itineraryCategories, placeCategories, tripCategoryLabelKey } from '../../utils/constants/constants.js';
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

// The apps show categories as t(`tripCategories.${value}`), keys the static
// check of locale keys can't see.
describe('category names', () => {
    const LOCALES = ['es', 'en', 'fr', 'it', 'de'].map(language => [language, JSON.parse(readFileSync(new URL(`../../locales/${language}.json`, import.meta.url)))]);

    it.each(LOCALES)('names every trip and place category in %s', (_, locale) => {
        const missing = [
            ...itineraryCategories.filter(({ value }) => !locale.tripCategories?.[value]).map(({ value }) => `tripCategories.${value}`),
            ...placeCategories.filter(({ value }) => !locale.placeCategories?.[value]).map(({ value }) => `placeCategories.${value}`),
        ];

        expect(missing).toEqual([]);
    });
});

describe('tripCategoryLabelKey', () => {
    it('names a category whatever its case, and the first of several', () => {
        expect(tripCategoryLabelKey('Adventure')).toBe('tripCategories.adventure');
        expect(tripCategoryLabelKey('relax, culture')).toBe('tripCategories.relax');
    });

    it('gives nothing for a category the apps do not know, or none', () => {
        expect(tripCategoryLabelKey('ballooning')).toBeNull();
        expect(tripCategoryLabelKey(undefined)).toBeNull();
    });
});
