import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocode, searchDestinations, searchPOIs } from '../../services/geocoding.js';

describe('searchDestinations', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('maps autocomplete features to {name, country, label, coordinates}', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{
                    properties: { city: 'Madrid', country: 'Spain', formatted: 'Madrid, Spain', lat: 40.4, lon: -3.7 },
                }],
            }),
        });

        const result = await searchDestinations('madr', { apiKey: 'key-1' });

        expect(result).toEqual([{
            name: 'Madrid', country: 'Spain', label: 'Madrid, Spain',
            coordinates: { lat: 40.4, lon: -3.7 },
        }]);
    });

    it('sends a proximity bias parameter when bias is provided', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });

        await searchDestinations('madr', { apiKey: 'key-1', bias: { lat: 40.4, lon: -3.7 } });

        const requestedUrl = global.fetch.mock.calls[0][0];
        expect(requestedUrl).toContain('bias=proximity%3A-3.7%2C40.4');
    });

    it('returns an empty array when the request fails', async () => {
        global.fetch.mockResolvedValue({ ok: false });

        const result = await searchDestinations('madr', { apiKey: 'key-1' });

        expect(result).toEqual([]);
    });
});

describe('searchPOIs', () => {
    it('filters by amenity and maps to {name, label, coordinates}', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{ properties: { name: 'Gas station', formatted: 'Gas station, Madrid', lat: 40.4, lon: -3.7 } }],
            }),
        });

        const result = await searchPOIs('gas', { apiKey: 'key-1' });

        expect(global.fetch.mock.calls[0][0]).toContain('type=amenity');
        expect(result).toEqual([{
            name: 'Gas station', label: 'Gas station, Madrid',
            coordinates: { lat: 40.4, lon: -3.7 },
        }]);
    });
});

describe('reverseGeocode', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('returns the first feature mapped like a destination', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{ properties: { city: 'Valencia', country: 'Spain', formatted: 'Carrer Example 8b, 46001 Valencia, Spain', lat: 39.4, lon: -0.4 } }],
            }),
        });

        const result = await reverseGeocode({ lat: 39.4, lon: -0.4, apiKey: 'key-1' });

        expect(result).toEqual({
            name: 'Valencia', country: 'Spain', label: 'Valencia, Spain',
            coordinates: { lat: 39.4, lon: -0.4 },
        });
    });

    // Regression: reverse geocoding the device's exact GPS position returns the most
    // precise feature at that point (a full street address in `formatted`), which used
    // to leak into the label shown for a "use my location" destination field. The label
    // must always be city-level, never the street address, even when Geoapify returns one.
    it('never puts the street-level formatted address in the label', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{
                    properties: {
                        city: 'Vésenaz', country: 'Switzerland',
                        formatted: 'Chemin Des Marèches 8b, 1222 Vésenaz, Switzerland',
                        lat: 46.25, lon: 6.19,
                    },
                }],
            }),
        });

        const result = await reverseGeocode({ lat: 46.25, lon: 6.19, apiKey: 'key-1' });

        expect(result.label).toBe('Vésenaz, Switzerland');
        expect(result.label).not.toContain('Chemin Des Marèches');
    });

    it('returns null when there are no features', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });

        const result = await reverseGeocode({ lat: 0, lon: 0, apiKey: 'key-1' });

        expect(result).toBeNull();
    });

    it('returns null when the request fails', async () => {
        global.fetch.mockResolvedValue({ ok: false });

        const result = await reverseGeocode({ lat: 0, lon: 0, apiKey: 'key-1' });

        expect(result).toBeNull();
    });
});
