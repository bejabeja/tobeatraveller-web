import { describe, expect, it } from 'vitest';
import { countryCodeFromLabel, countryCodeFromName, ISO_COUNTRY_CODES } from '../../utils/countryCodes.js';

describe('countryCodeFromName', () => {
    it.each([
        ['Spain', 'ES'], ['France', 'FR'], ['United States', 'US'], ['United Kingdom', 'GB'],
        ['Switzerland', 'CH'], ['Russia', 'RU'], ['Kosovo', 'XK'],
    ])('resolves %s to %s', (name, code) => {
        expect(countryCodeFromName(name)).toBe(code);
    });

    // Intl's region list also has retired codes; resolving to them would
    // split one country into two stamps.
    it('never resolves to a retired code (UK, FX, SU)', () => {
        expect(['UK', 'FX', 'SU']).not.toContain(countryCodeFromName('United Kingdom'));
        expect(['UK', 'FX', 'SU']).not.toContain(countryCodeFromName('France'));
        expect(['UK', 'FX', 'SU']).not.toContain(countryCodeFromName('Russia'));
        expect(ISO_COUNTRY_CODES).not.toContain('UK');
    });

    it('treats different spellings of the same country as one', () => {
        expect(countryCodeFromName('USA')).toBe(countryCodeFromName('United States of America'));
        expect(countryCodeFromName('Turkey')).toBe(countryCodeFromName('Türkiye'));
        expect(countryCodeFromName("Côte d’Ivoire")).toBe(countryCodeFromName('Ivory Coast'));
        expect(countryCodeFromName('Myanmar')).toBe('MM');
    });

    it('ignores case and surrounding spaces', () => {
        expect(countryCodeFromName('  spain ')).toBe('ES');
    });

    it('returns null for anything that is not a country', () => {
        expect(countryCodeFromName('Barcelona')).toBeNull();
        expect(countryCodeFromName('')).toBeNull();
        expect(countryCodeFromName(null)).toBeNull();
    });
});

describe('countryCodeFromLabel', () => {
    it('takes the country from the end of a Geoapify label', () => {
        expect(countryCodeFromLabel('Barcelona, Barcelonès, CT, Spain')).toBe('ES');
        expect(countryCodeFromLabel('New York, NY, United States of America')).toBe('US');
    });

    it('handles a label that is only the country', () => {
        expect(countryCodeFromLabel('Finland')).toBe('FI');
    });

    it('returns null when the label does not end with a country', () => {
        expect(countryCodeFromLabel('Barcelona')).toBeNull();
        expect(countryCodeFromLabel(null)).toBeNull();
    });
});
