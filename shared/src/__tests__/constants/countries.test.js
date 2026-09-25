import { describe, expect, it } from 'vitest';
import { ISO_COUNTRY_CODES } from '../../../../api/src/utils/countryCodes.js';
import { COUNTRY_NAMES, countryFlag, countryName } from '../../utils/constants/countries.js';

describe('country display helpers', () => {
    // The API may return any of its ISO codes; each needs a name in the apps.
    it('has a Spanish and an English name for every country code the API can return', () => {
        const missing = ISO_COUNTRY_CODES.filter(code => !COUNTRY_NAMES[code]?.es || !COUNTRY_NAMES[code]?.en);

        expect(missing).toEqual([]);
    });

    it('names a country in the viewer language', () => {
        expect(countryName('ES', 'es')).toBe('España');
        expect(countryName('ES', 'en')).toBe('Spain');
        expect(countryName('ES', 'es-ES')).toBe('España');
    });

    it('falls back to the code for an unknown country', () => {
        expect(countryName('ZZ', 'es')).toBe('ZZ');
    });

    it('builds the flag emoji from the code', () => {
        expect(countryFlag('ES')).toBe('🇪🇸');
        expect(countryFlag('fr')).toBe('🇫🇷');
    });
});
