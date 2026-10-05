import { describe, expect, it } from 'vitest';
import { draftToResume } from '../../utils/unfinishedDraft.js';

const draft = (savedAt, values) => ({ savedAt: new Date(savedAt), values });

describe('draftToResume', () => {
    it('offers nothing when no trip was left unfinished', () => {
        expect(draftToResume({})).toBeNull();
        expect(draftToResume()).toBeNull();
    });

    it('offers the form trip by its title', () => {
        expect(draftToResume({ form: draft('2026-10-01T10:00:00Z', { title: ' Algarve ' }) }))
            .toEqual({ kind: 'itinerary', name: 'Algarve', savedAt: new Date('2026-10-01T10:00:00Z') });
    });

    it('falls back to the destination when it has no title yet', () => {
        expect(draftToResume({ plan: draft('2026-10-01T10:00:00Z', { title: '', destination: { name: 'Lisboa' } }) }))
            .toMatchObject({ kind: 'experience', name: 'Lisboa' });
    });

    it('still offers a trip with neither, so the card can say it is unnamed', () => {
        expect(draftToResume({ form: draft('2026-10-01T10:00:00Z', { places: [{}] }) })).toMatchObject({ name: '' });
    });

    // Regression-in-waiting: with two unfinished, one would be offered and the other hidden for good.
    it('offers the one saved last when both ways of starting a trip have one', () => {
        const older = draft('2026-09-20T10:00:00Z', { title: 'Vieja' });
        const newer = draft('2026-10-02T10:00:00Z', { title: 'Nueva' });

        expect(draftToResume({ form: older, plan: newer })).toMatchObject({ kind: 'experience', name: 'Nueva' });
        expect(draftToResume({ form: newer, plan: older })).toMatchObject({ kind: 'itinerary', name: 'Nueva' });
    });
});
