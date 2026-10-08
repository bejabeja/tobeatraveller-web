import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { packingCategories } from '../../utils/constants/constants.js';
import {
    PACKING_TEMPLATES, packingTemplateItems, packingTemplateOptions, packingTemplateOptionsFor, suggestedTemplateForTrip,
} from '../../utils/constants/packingTemplates.js';

const LANGUAGES = ['en', 'es', 'fr', 'it', 'de'];
const apiCategories = () => {
    const source = readFileSync(new URL('../../../../api/src/utils/packingConstants.js', import.meta.url), 'utf8');
    return [...source.matchAll(/'([a-z_]+)'/g)].map(match => match[1]);
};

describe('packingTemplateItems', () => {
    it('starts an empty list with nothing', () => {
        expect(packingTemplateItems(PACKING_TEMPLATES.EMPTY, 'es')).toEqual([]);
    });

    it('gives what to check before driving off, in the van category', () => {
        const items = packingTemplateItems(PACKING_TEMPLATES.DEPARTURE, 'es');

        expect(items[0]).toEqual({ category: 'van', name: 'Gas cerrado' });
        expect(items.every(item => item.category === 'van')).toBe(true);
    });

    it('keeps a weekend much shorter than a long trip', () => {
        const weekend = packingTemplateItems(PACKING_TEMPLATES.WEEKEND, 'es');
        const longTrip = packingTemplateItems(PACKING_TEMPLATES.LONG_TRIP, 'es');

        expect(weekend.length).toBeLessThan(longTrip.length / 2);
        expect(weekend).toContainEqual({ category: 'documents', name: 'DNI / pasaporte' });
    });

    it('adds what the cold needs to a winter list', () => {
        expect(packingTemplateItems(PACKING_TEMPLATES.WINTER, 'es')).toEqual(expect.arrayContaining([
            { category: 'clothing', name: 'Plumífero' },
            { category: 'van', name: 'Cadenas para la nieve' },
        ]));
    });

    it('leaves the van items out of a winter list for someone who does not travel by van', () => {
        const items = packingTemplateItems(PACKING_TEMPLATES.WINTER, 'es', { isInAVan: false });

        expect(items.some(item => item.category === 'van')).toBe(false);
        expect(items).toContainEqual({ category: 'clothing', name: 'Plumífero' });
    });

    it('offers the before-driving-off list only to someone who travels by van', () => {
        const ids = (isInAVan) => packingTemplateOptionsFor(isInAVan).map(option => option.id);

        expect(ids(true)).toContain(PACKING_TEMPLATES.DEPARTURE);
        expect(ids(false)).not.toContain(PACKING_TEMPLATES.DEPARTURE);
        expect(ids(false)).toContain(PACKING_TEMPLATES.WEEKEND);
    });

    it('writes every template in every language, with nothing missing or repeated', () => {
        for (const { id } of packingTemplateOptions) {
            const lengths = LANGUAGES.map(language => {
                const items = packingTemplateItems(id, language);
                expect(items.every(item => item.name)).toBe(true);
                expect(new Set(items.map(item => `${item.category}|${item.name}`)).size).toBe(items.length);
                return items.length;
            });
            expect(new Set(lengths).size).toBe(1);
        }
    });

    it('falls back to English for a language it doesn\'t have', () => {
        expect(packingTemplateItems(PACKING_TEMPLATES.DEPARTURE, 'pt')[0].name).toBe('Gas off');
    });

    it('only uses the categories the API accepts', () => {
        const accepted = apiCategories();

        expect(packingCategories.map(category => category.value)).toEqual(accepted);
        for (const { id } of packingTemplateOptions) {
            expect(packingTemplateItems(id, 'en').every(item => accepted.includes(item.category))).toBe(true);
        }
    });
});

describe('suggestedTemplateForTrip', () => {
    it('suggests the weekend list for a short trip and the long one from five days', () => {
        expect(suggestedTemplateForTrip({ tripTotalDays: 3 })).toBe(PACKING_TEMPLATES.WEEKEND);
        expect(suggestedTemplateForTrip({ tripTotalDays: 5 })).toBe(PACKING_TEMPLATES.LONG_TRIP);
    });

    it('goes by how many days an experience without a date lasts', () => {
        expect(suggestedTemplateForTrip({ startDate: null, endDate: null, tripTotalDays: 7 })).toBe(PACKING_TEMPLATES.LONG_TRIP);
    });

    it('falls back to the weekend list when it does not know how long the trip is', () => {
        expect(suggestedTemplateForTrip({})).toBe(PACKING_TEMPLATES.WEEKEND);
    });
});

