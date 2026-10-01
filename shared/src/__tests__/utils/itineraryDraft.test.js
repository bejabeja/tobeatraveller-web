import { describe, expect, it } from 'vitest';
import {
    hasItineraryDraftProgress,
    ITINERARY_DRAFT_KEY_PREFIX,
    ITINERARY_DRAFT_KINDS,
    ITINERARY_DRAFT_MAX_AGE_DAYS,
    itineraryDraftKey,
    parseItineraryDraft,
    serializeItineraryDraft,
} from '../../utils/itineraryDraft.js';

const NOW = new Date('2026-10-01T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const values = { title: 'Ruta por Portugal', destination: { name: 'Lisboa' }, places: [] };
const draft = { values, days: [1, 2], step: 3, pace: 'relaxed' };

describe('hasItineraryDraftProgress', () => {
    it('is false for a form nobody touched', () => {
        expect(hasItineraryDraftProgress({ title: '', destination: { name: '' }, places: [] })).toBe(false);
        expect(hasItineraryDraftProgress({ title: '   ' })).toBe(false);
        expect(hasItineraryDraftProgress()).toBe(false);
    });

    it.each([
        [{ title: 'Algo' }],
        [{ destination: { name: 'Lisboa' } }],
        [{ places: [{}] }],
    ])('is true as soon as there is a title, a destination or a place: %j', (partial) => {
        expect(hasItineraryDraftProgress(partial)).toBe(true);
    });
});

describe('itineraryDraftKey', () => {
    it('is different for each account, so a shared device never mixes them', () => {
        expect(itineraryDraftKey('user-1')).not.toBe(itineraryDraftKey('user-2'));
    });

    it('is different for the form and for the AI plan, so one flow never offers what was left in the other', () => {
        expect(itineraryDraftKey('user-1', ITINERARY_DRAFT_KINDS.FORM)).not.toBe(itineraryDraftKey('user-1', ITINERARY_DRAFT_KINDS.AI_PLAN));
    });

    // Regression-in-waiting: signing out clears by this prefix, so a kind outside it would stay on a shared device.
    it.each(Object.values(ITINERARY_DRAFT_KINDS))('starts with the prefix signing out clears, for %s', (kind) => {
        expect(itineraryDraftKey('user-1', kind).startsWith(ITINERARY_DRAFT_KEY_PREFIX)).toBe(true);
    });

    it('keeps the key the form has always used', () => {
        expect(itineraryDraftKey('user-1')).toBe('itinerary-draft:user-1');
    });
});

describe('parseItineraryDraft', () => {
    it('gives back what was saved, with the day it was saved', () => {
        const parsed = parseItineraryDraft(serializeItineraryDraft(draft, NOW), NOW);

        expect(parsed).toEqual({ savedAt: NOW, values, days: [1, 2], step: 3, pace: 'relaxed' });
    });

    it.each([[null], [undefined], [''], ['not json'], ['{"version":1}'], ['null']])('is no draft when it is %s', (raw) => {
        expect(parseItineraryDraft(raw, NOW)).toBeNull();
    });

    it('is no draft when another version of the app wrote it', () => {
        const other = JSON.stringify({ ...JSON.parse(serializeItineraryDraft(draft, NOW)), version: 99 });

        expect(parseItineraryDraft(other, NOW)).toBeNull();
    });

    it('is no draft when the date it was saved is damaged', () => {
        const damaged = JSON.stringify({ ...JSON.parse(serializeItineraryDraft(draft, NOW)), savedAt: 'yesterday-ish' });

        expect(parseItineraryDraft(damaged, NOW)).toBeNull();
    });

    it('is no draft when it holds nothing worth coming back to', () => {
        const empty = serializeItineraryDraft({ ...draft, values: { title: '', destination: { name: '' }, places: [] } }, NOW);

        expect(parseItineraryDraft(empty, NOW)).toBeNull();
    });

    // Regression-in-waiting: a trip started months ago and forgotten should not turn up as if it were this morning's.
    it('stops being offered after the days it is kept', () => {
        const saved = serializeItineraryDraft(draft, new Date(NOW.getTime() - (ITINERARY_DRAFT_MAX_AGE_DAYS - 1) * DAY_MS));
        const old = serializeItineraryDraft(draft, new Date(NOW.getTime() - (ITINERARY_DRAFT_MAX_AGE_DAYS + 1) * DAY_MS));

        expect(parseItineraryDraft(saved, NOW)).not.toBeNull();
        expect(parseItineraryDraft(old, NOW)).toBeNull();
    });

    it('starts from day one and the first step when those were not saved', () => {
        const raw = JSON.stringify({ version: 1, savedAt: NOW.toISOString(), values });

        expect(parseItineraryDraft(raw, NOW)).toMatchObject({ days: [1], step: 0 });
    });
});
