import { describe, expect, it } from 'vitest';
import { buildPushMessage } from '../../utils/pushMessages.js';

describe('trip reminder push', () => {
    it('says when the trip starts and how much is left, in the device language', () => {
        expect(buildPushMessage('trip_packing', 'es', { itineraryTitle: 'Costa Vicentina', remainingCount: 8 })).toEqual({
            title: 'Costa Vicentina empieza en 2 días',
            body: 'Te quedan 8 cosas por preparar.',
        });
        expect(buildPushMessage('trip_packing', 'en', { itineraryTitle: 'Algarve', remainingCount: 1 }).body).toBe('You have 1 thing left to pack.');
    });

    it('has the reminder in every language', () => {
        for (const locale of ['en', 'es', 'fr', 'it', 'de']) {
            expect(buildPushMessage('trip_packing', locale, { itineraryTitle: 'X', remainingCount: 2 })).not.toBeNull();
        }
    });
});
