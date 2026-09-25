import { describe, it, expect } from 'vitest';
import {
    signupSchema, resetPasswordSchema, vanLogEntrySchema,
    createItineraryDataSchema, updateItineraryDataSchema,
    registerPushTokenSchema, createVanLogEntrySchema, vanLogEntrySchema as vanLogUpdateSchema,
    declaredCountriesSchema,
} from '../../utils/schemasValidation.js';

const validSignupData = {
    username: 'traveller',
    email: 'traveller@example.com',
    confirmPassword: '      ',
    termsAccepted: true,
    ageConfirmed: true,
};

// Regression coverage: a password made only of spaces used to satisfy min(6),
// since length alone was checked and the value was never trimmed. Signup would
// succeed with a password nobody could reasonably type back (whitespace-only).
describe('signupSchema rejects whitespace-only passwords', () => {
    it('fails when the password is only spaces, even if it reaches the minimum length', () => {
        const result = signupSchema.safeParse({ ...validSignupData, password: '      ' });

        expect(result.success).toBe(false);
    });

    it('still accepts a normal password of at least 6 characters', () => {
        const result = signupSchema.safeParse({
            ...validSignupData,
            password: 'abcdef',
            confirmPassword: 'abcdef',
        });

        expect(result.success).toBe(true);
    });
});

describe('vanLogEntrySchema restricts pricePerLiter to the fuel category', () => {
    const baseEntry = { title: null, amount: 60, currency: 'EUR', location: null, notes: null, entryDate: '2026-08-27' };

    it('accepts a pricePerLiter on a fuel entry', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'fuel', pricePerLiter: 1.799 });

        expect(result.success).toBe(true);
    });

    it('rejects a pricePerLiter on a non-fuel entry', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'parking', pricePerLiter: 1.799 });

        expect(result.success).toBe(false);
    });

    it('accepts a fuel entry with no pricePerLiter at all', () => {
        const result = vanLogEntrySchema.safeParse({ ...baseEntry, category: 'fuel', pricePerLiter: null });

        expect(result.success).toBe(true);
    });
});

// Regression coverage: createItinerary/updateItinerary used to JSON.parse the
// request body straight into the service with no validation at all, so a
// malformed or malicious payload (bad dates, an out-of-range category, a
// non-numeric budget) reached the repository untouched.
describe('createItineraryDataSchema', () => {
    const baseItinerary = {
        title: 'A weekend in Rome',
        location: { name: 'Rome', label: 'Rome, Italy', lat: 41.9, lon: 12.5 },
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        numberOfPeople: 2,
        category: 'roadtrip',
        currency: 'EUR',
    };

    it('accepts a well-formed itinerary with no places', () => {
        const result = createItineraryDataSchema.safeParse(baseItinerary);

        expect(result.success).toBe(true);
        expect(result.data.places).toEqual([]);
    });

    it('rejects an end date before the start date', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, endDate: '2025-12-31' });

        expect(result.success).toBe(false);
    });

    it('rejects a category outside the known list', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, category: 'not-a-real-category' });

        expect(result.success).toBe(false);
    });

    it('leaves budget as null instead of defaulting to 0 when left blank', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, budget: '' });

        expect(result.success).toBe(true);
        expect(result.data.budget).toBeNull();
    });

    it('parses a numeric-string budget', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, budget: '500' });

        expect(result.success).toBe(true);
        expect(result.data.budget).toBe(500);
    });

    it('keeps an explicit zero budget instead of treating it as blank', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, budget: 0 });

        expect(result.success).toBe(true);
        expect(result.data.budget).toBe(0);
    });

    it('accepts the experience source used by the AI trip planner', () => {
        const result = createItineraryDataSchema.safeParse({ ...baseItinerary, source: 'experience' });

        expect(result.success).toBe(true);
        expect(result.data.source).toBe('experience');
    });

    it('rejects a place missing its infoPlace', () => {
        const result = createItineraryDataSchema.safeParse({
            ...baseItinerary,
            places: [{ orderIndex: 0, dayNumber: 1 }],
        });

        expect(result.success).toBe(false);
    });

    it('defaults a place with no dayNumber to day 1', () => {
        const result = createItineraryDataSchema.safeParse({
            ...baseItinerary,
            places: [{ orderIndex: 0, infoPlace: { name: 'Colosseum', lat: 41.89, lon: 12.49 } }],
        });

        expect(result.success).toBe(true);
        expect(result.data.places[0].dayNumber).toBe(1);
    });
});

describe('updateItineraryDataSchema', () => {
    const baseItinerary = {
        title: 'A weekend in Rome',
        location: { name: 'Rome', label: 'Rome, Italy', lat: 41.9, lon: 12.5 },
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        numberOfPeople: 2,
        category: 'roadtrip',
        currency: 'EUR',
    };

    it('accepts an existing place carrying its real id', () => {
        const result = updateItineraryDataSchema.safeParse({
            ...baseItinerary,
            places: [{ id: '123e4567-e89b-12d3-a456-426614174000', orderIndex: 0, infoPlace: { name: 'Colosseum', lat: 41.89, lon: 12.49 } }],
        });

        expect(result.success).toBe(true);
    });

    it('accepts keepImageIds for gallery diffing', () => {
        const result = updateItineraryDataSchema.safeParse({ ...baseItinerary, keepImageIds: ['abc', 'def'] });

        expect(result.success).toBe(true);
    });
});

describe('resetPasswordSchema rejects whitespace-only passwords', () => {
    it('fails when newPassword is only spaces', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'a'.repeat(64),
            newPassword: '      ',
        });

        expect(result.success).toBe(false);
    });

    it('still accepts a normal newPassword of at least 6 characters', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'a'.repeat(64),
            newPassword: 'abcdef',
        });

        expect(result.success).toBe(true);
    });
});

describe('registerPushTokenSchema', () => {
    it('accepts an Expo push token and defaults the locale to English', () => {
        const result = registerPushTokenSchema.safeParse({ token: 'ExponentPushToken[abc123]', platform: 'ios' });

        expect(result.success).toBe(true);
        expect(result.data.locale).toBe('en');
    });

    it('rejects a token that is not an Expo push token', () => {
        const result = registerPushTokenSchema.safeParse({ token: 'fcm-raw-device-token', platform: 'android' });

        expect(result.success).toBe(false);
    });

    // Regression: without a max length, a longer token passed validation and
    // then failed on the VARCHAR(255) column as a 500 instead of a 400.
    it('rejects a token longer than the column that stores it', () => {
        const token = `ExponentPushToken[${'a'.repeat(250)}]`;

        const result = registerPushTokenSchema.safeParse({ token, platform: 'android' });

        expect(result.success).toBe(false);
    });

    it('rejects a platform other than ios or android', () => {
        const result = registerPushTokenSchema.safeParse({ token: 'ExponentPushToken[abc123]', platform: 'web' });

        expect(result.success).toBe(false);
    });
});

describe('client-generated ids on create schemas', () => {
    const entry = { category: 'fuel', entryDate: '2026-09-01' };

    it('keeps a valid uuid on create', () => {
        const id = '8a6e0804-2bd0-4672-b79d-d97027f9071a';

        const result = createVanLogEntrySchema.safeParse({ ...entry, id });

        expect(result.data.id).toBe(id);
    });

    it('rejects an id that is not a uuid', () => {
        const result = createVanLogEntrySchema.safeParse({ ...entry, id: 'not-a-uuid' });

        expect(result.success).toBe(false);
    });

    it('still applies the fuel-only price rule on create', () => {
        const result = createVanLogEntrySchema.safeParse({ ...entry, category: 'groceries', pricePerLiter: 1.5 });

        expect(result.error.errors[0].message).toBe('Price per liter only applies to the fuel category');

        expect(result.success).toBe(false);
    });

    it('drops any id sent on update, where the id comes from the URL', () => {
        const result = vanLogUpdateSchema.safeParse({ ...entry, id: '8a6e0804-2bd0-4672-b79d-d97027f9071a' });

        expect(result.data.id).toBeUndefined();
    });
});

describe('declaredCountriesSchema', () => {
    it('accepts ISO country codes, in any case', () => {
        const result = declaredCountriesSchema.safeParse({ countries: ['jp', 'TH'] });

        expect(result.success).toBe(true);
        expect(result.data.countries).toEqual(['JP', 'TH']);
    });

    it('accepts an empty list, to clear them all', () => {
        expect(declaredCountriesSchema.safeParse({ countries: [] }).success).toBe(true);
    });

    it('rejects a code that is not a country', () => {
        const result = declaredCountriesSchema.safeParse({ countries: ['JP', 'ZZ'] });

        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toBe('Unknown country');
    });

    it('rejects anything that is not a list of codes', () => {
        expect(declaredCountriesSchema.safeParse({ countries: 'JP' }).success).toBe(false);
        expect(declaredCountriesSchema.safeParse({}).success).toBe(false);
    });

    it('rejects more entries than there are countries', () => {
        expect(declaredCountriesSchema.safeParse({ countries: Array(300).fill('JP') }).success).toBe(false);
    });
});
