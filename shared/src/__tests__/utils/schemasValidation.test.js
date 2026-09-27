import { describe, expect, it } from 'vitest';
import { createItinerarySchema, updateUserSchema, vanLogEntrySchema } from '../../utils/schemasValidation.js';

// Regression coverage for the "can't save profile without a location" bug: the
// signup flow never asks for a location, but this schema required at least 2
// characters, so anyone with a blank location couldn't save any other profile
// change (e.g. just editing their bio) until they filled it in.
describe('updateUserSchema', () => {
    const baseFields = { username: 'traveller', name: null, about: null, bio: null };

    it('accepts an empty location', () => {
        const result = updateUserSchema.safeParse({ ...baseFields, location: '' });
        expect(result.success).toBe(true);
    });

    // The empty-string fix above didn't cover this: a user whose location was
    // never set has it stored (and returned by the API) as null, not ''.
    it('accepts a null location', () => {
        const result = updateUserSchema.safeParse({ ...baseFields, location: null });
        expect(result.success).toBe(true);
    });

    it('still rejects a location over 50 characters', () => {
        const result = updateUserSchema.safeParse({ ...baseFields, location: 'a'.repeat(51) });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toBe('validation.tooLong');
    });
});

// Regression coverage for the "€0 budget" bug: an itinerary saved without a
// budget used to be stored (and displayed) as 0, indistinguishable from a
// trip that genuinely costs nothing.
describe('createItinerarySchema budget', () => {
    const baseItinerary = {
        title: 'A weekend in Rome',
        destination: { name: 'Rome', label: 'Rome, Italy', coordinates: { lat: 41.9, lon: 12.5 } },
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        category: 'city',
        currency: '',
    };

    it('leaves budget as null when left blank, instead of defaulting to 0', () => {
        const result = createItinerarySchema.safeParse({ ...baseItinerary, budget: '' });
        expect(result.success).toBe(true);
        expect(result.data.budget).toBeNull();
    });

    it('still parses a valid numeric budget', () => {
        const result = createItinerarySchema.safeParse({ ...baseItinerary, budget: '500' });
        expect(result.success).toBe(true);
        expect(result.data.budget).toBe(500);
    });
});

describe('vanLogEntrySchema pricePerLiter', () => {
    const baseEntry = { title: '', amount: '60', currency: 'EUR', entryDate: '2026-08-27' };

    it('parses the string input into a number on a fuel entry', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'fuel', pricePerLiter: '1.799' });

        expect(result.success).toBe(true);
        expect(result.data.pricePerLiter).toBe(1.799);
    });

    it('rejects a pricePerLiter on a non-fuel entry', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'parking', pricePerLiter: '1.799' });

        expect(result.success).toBe(false);
    });

    it('leaves pricePerLiter as null when left blank', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'fuel', pricePerLiter: '' });

        expect(result.success).toBe(true);
        expect(result.data.pricePerLiter).toBeNull();
    });
});
