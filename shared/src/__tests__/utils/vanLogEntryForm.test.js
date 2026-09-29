import { describe, expect, it } from 'vitest';
import { initialVanLogTripId, vanLogEntryToFormValues, vanLogFormValuesToPayload } from '../../utils/vanLogEntryForm.js';

describe('vanLogEntryToFormValues', () => {
    it('starts a new expense blank, in euros, dated today', () => {
        const values = vanLogEntryToFormValues(null, '2026-09-29');

        expect(values).toMatchObject({ category: '', amount: '', currency: 'EUR', entryDate: '2026-09-29', notes: '' });
    });

    it('fills the form with what the expense already has', () => {
        const values = vanLogEntryToFormValues({
            category: 'fuel', title: 'Diesel', amount: 45.5, currency: 'CHF', pricePerLiter: 1.789,
            entryDate: '2026-09-01T00:00:00.000Z', notes: 'Full tank',
            location: { name: 'Zurich', country: 'Switzerland', label: 'Zurich, CH', lat: '47.37', lon: 8.54 },
        });

        expect(values).toEqual({
            category: 'fuel', title: 'Diesel', amount: '45.5', currency: 'CHF', pricePerLiter: '1.789',
            entryDate: '2026-09-01', notes: 'Full tank',
            location: { name: 'Zurich', country: 'Switzerland', label: 'Zurich, CH', coordinates: { lat: 47.37, lon: 8.54 } },
        });
    });

    it('does not invent a currency for an existing expense that had none', () => {
        const values = vanLogEntryToFormValues({ category: 'water_fresh', amount: null, currency: null, entryDate: '2026-09-01' });

        expect(values.currency).toBe('');
        expect(values.amount).toBe('');
    });

    it('turns missing optional fields of an existing expense into empty strings and no location', () => {
        const values = vanLogEntryToFormValues({ category: 'other', entryDate: '2026-09-01', location: null, title: null, notes: null });

        expect(values).toMatchObject({ title: '', notes: '', pricePerLiter: '' });
        expect(values.location.name).toBe('');
    });

    it('keeps the entry date when editing instead of resetting it to today', () => {
        expect(vanLogEntryToFormValues({ category: 'other', entryDate: '2026-01-05' }, '2026-09-29').entryDate).toBe('2026-01-05');
    });
});

describe('vanLogFormValuesToPayload', () => {
    const base = {
        category: 'other', title: '', amount: 12, currency: 'EUR', pricePerLiter: null,
        location: { name: '', label: '', coordinates: { lat: 0, lon: 0 } }, notes: '', entryDate: '2026-09-01',
    };

    it('keeps the price per liter only for fuel', () => {
        expect(vanLogFormValuesToPayload({ ...base, category: 'fuel', pricePerLiter: 1.7 }, '').pricePerLiter).toBe(1.7);
        expect(vanLogFormValuesToPayload({ ...base, category: 'toll', pricePerLiter: 1.7 }, '').pricePerLiter).toBeNull();
    });

    it('drops the default currency of a new expense when there is no amount', () => {
        expect(vanLogFormValuesToPayload({ ...base, amount: null }, '').currency).toBeNull();
        expect(vanLogFormValuesToPayload(base, '').currency).toBe('EUR');
    });

    it('keeps the currency of an expense being edited even when the amount is cleared', () => {
        const payload = vanLogFormValuesToPayload({ ...base, amount: null, currency: 'CHF' }, '', { isEditing: true });

        expect(payload.currency).toBe('CHF');
    });

    it('sends no currency when editing an expense that never had one', () => {
        const payload = vanLogFormValuesToPayload({ ...base, amount: null, currency: '' }, '', { isEditing: true });

        expect(payload.currency).toBeNull();
    });

    it('sends empty text fields as null', () => {
        const payload = vanLogFormValuesToPayload(base, '');

        expect(payload.title).toBeNull();
        expect(payload.notes).toBeNull();
        expect(payload.location).toBeNull();
    });

    it('flattens a chosen location into the lat/lon the API expects', () => {
        const payload = vanLogFormValuesToPayload(
            { ...base, location: { name: 'Faro', country: 'Portugal', label: '', coordinates: { lat: 37.01, lon: -7.93 } } }, ''
        );

        expect(payload.location).toEqual({ name: 'Faro', country: 'Portugal', label: 'Faro', lat: 37.01, lon: -7.93 });
    });

    it('sends the trip, or null to take the expense off its trip', () => {
        expect(vanLogFormValuesToPayload(base, 'trip-1').itineraryId).toBe('trip-1');
        expect(vanLogFormValuesToPayload(base, '').itineraryId).toBeNull();
    });
});

describe('initialVanLogTripId', () => {
    const underWay = { id: 'now', startDate: '2026-09-25', endDate: '2026-10-05' };
    const past = { id: 'old', startDate: '2026-01-01', endDate: '2026-01-10' };
    const today = '2026-09-29';

    it('defaults a new expense to the trip under way today', () => {
        expect(initialVanLogTripId({ entry: null, trips: [past, underWay], today })).toBe('now');
    });

    it('starts a new expense without a trip when none is under way', () => {
        expect(initialVanLogTripId({ entry: null, trips: [past], today })).toBe('');
    });

    it('prefers the trip the caller asked for over the one under way', () => {
        expect(initialVanLogTripId({ entry: null, requestedTripId: 'old', trips: [past, underWay], today })).toBe('old');
    });

    it('keeps an existing expense on its own trip instead of moving it to the one under way', () => {
        const entry = { itinerary: { id: 'old', title: 'Old' } };

        expect(initialVanLogTripId({ entry, trips: [past, underWay], today })).toBe('old');
    });

    it('keeps an existing expense without a trip without one, even with a trip under way', () => {
        expect(initialVanLogTripId({ entry: { itinerary: null }, trips: [underWay], today })).toBe('');
    });

    it('ignores trips without dates when looking for the one under way', () => {
        expect(initialVanLogTripId({ entry: null, trips: [{ id: 'undated', startDate: null, endDate: null }], today })).toBe('');
    });
});
