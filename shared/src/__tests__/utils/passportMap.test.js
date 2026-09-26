import { describe, expect, it } from 'vitest';
import { MAP_COUNTRY_STATES, passportMap, passportShareMap } from '../../utils/passportMap.js';
import { WORLD_MAP } from '../../utils/constants/worldMap.js';

const passport = (overrides) => ({ countries: [], declaredCountries: [], ...overrides });
const stateOf = (map, code) => map.countries.find(country => country.code === code)?.state;

describe('passportMap', () => {
    it('paints every visited country, telling apart the ones only the owner sees', () => {
        const map = passportMap(passport({ countries: [{ code: 'ES', isPrivate: false }, { code: 'FR', isPrivate: true }] }));

        expect(stateOf(map, 'ES')).toBe(MAP_COUNTRY_STATES.VISITED);
        expect(stateOf(map, 'FR')).toBe(MAP_COUNTRY_STATES.PRIVATE);
        expect(stateOf(map, 'IT')).toBeNull();
    });

    // They show on the passport, but no trip backs them.
    it('outlines the countries the user marked by hand, unless a trip already stamped them', () => {
        const map = passportMap(passport({
            countries: [{ code: 'ES', isPrivate: false }],
            declaredCountries: [{ code: 'ES' }, { code: 'JP' }],
        }));

        expect(stateOf(map, 'ES')).toBe(MAP_COUNTRY_STATES.VISITED);
        expect(stateOf(map, 'JP')).toBe(MAP_COUNTRY_STATES.DECLARED);
    });

    // So their borders aren't hidden under the neighbours' ones.
    it('draws the painted countries last', () => {
        const map = passportMap(passport({ countries: [{ code: 'ES', isPrivate: false }] }));

        expect(map.countries.at(-1).code).toBe('ES');
    });

    // Andorra or Gibraltar can't be seen at world scale.
    it('marks a painted tiny country with a dot, and no other', () => {
        const map = passportMap(passport({ countries: [{ code: 'AD', isPrivate: false }] }));
        const andorra = map.countries.find(country => country.code === 'AD');
        const luxembourg = map.countries.find(country => country.code === 'LU');

        expect(andorra.dot).toEqual(WORLD_MAP.countries.AD.dot);
        expect(luxembourg.dot).toBeNull();
    });

    it('gives the drawing size, the same on every platform', () => {
        expect(passportMap(passport())).toMatchObject({ width: WORLD_MAP.width, height: WORLD_MAP.height });
    });

    it('knows every country the passport can stamp except Antarctica', async () => {
        const { COUNTRY_NAMES } = await import('../../utils/constants/countries.js');

        const missing = Object.keys(COUNTRY_NAMES).filter(code => !WORLD_MAP.countries[code]);

        expect(missing).toEqual(['AQ']);
    });
});

describe('passportShareMap', () => {
    it('paints every shared country alike and leaves the rest unpainted', () => {
        const map = passportShareMap(['ES', 'FR']);

        expect(stateOf(map, 'ES')).toBe(MAP_COUNTRY_STATES.VISITED);
        expect(stateOf(map, 'FR')).toBe(MAP_COUNTRY_STATES.VISITED);
        expect(stateOf(map, 'IT')).toBeNull();
    });
});
