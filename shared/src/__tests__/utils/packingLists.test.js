import { describe, expect, it } from 'vitest';
import {
    copyListName, isOnShoppingList, listsForTrip, MOVE_DOWN, MOVE_UP, moveWithinCategory, PACKING_LIST_NAME_MAX_LENGTH, tripsToLinkTo,
} from '../../utils/packingLists.js';

const items = [
    { id: 'gas', category: 'van', position: 1 },
    { id: 'jacket', category: 'clothing', position: 2 },
    { id: 'awning', category: 'van', position: 3 },
    { id: 'blocks', category: 'van', position: 5 },
];

describe('moveWithinCategory', () => {
    it('swaps places with the one above in its category, skipping other categories', () => {
        expect(moveWithinCategory(items, 'awning', MOVE_UP)).toEqual([
            { id: 'awning', position: 1 },
            { id: 'gas', position: 3 },
        ]);
    });

    it('swaps places with the one below', () => {
        expect(moveWithinCategory(items, 'awning', MOVE_DOWN)).toEqual([
            { id: 'awning', position: 5 },
            { id: 'blocks', position: 3 },
        ]);
    });

    it('leaves alone what has no place yet, such as something still waiting to sync', () => {
        const withPending = [...items, { id: 'pending', category: 'van' }];

        expect(moveWithinCategory(withPending, 'pending', MOVE_UP)).toEqual([]);
        expect(moveWithinCategory(withPending, 'blocks', MOVE_DOWN)).toEqual([]);
    });

    // Regression: two things on the same place swapped places with each
    // other, so nothing moved and one could never get past the other.
    it('numbers the category again when two things share a place', () => {
        const tied = [
            { id: 'gas', category: 'van', position: 1 },
            { id: 'awning', category: 'van', position: 2 },
            { id: 'blocks', category: 'van', position: 2 },
            { id: 'hose', category: 'van', position: 3 },
        ];
        const moves = moveWithinCategory(tied, 'blocks', MOVE_UP);
        const moved = tied.map(item => ({ ...item, ...moves.find(move => move.id === item.id) }))
            .sort((a, b) => a.position - b.position)
            .map(item => item.id);

        expect(moved).toEqual(['gas', 'blocks', 'awning', 'hose']);
        expect(new Set(tied.map(item => moves.find(move => move.id === item.id)?.position ?? item.position)).size).toBe(4);
    });

    it('does nothing at either end of its category', () => {
        expect(moveWithinCategory(items, 'gas', MOVE_UP)).toEqual([]);
        expect(moveWithinCategory(items, 'jacket', MOVE_DOWN)).toEqual([]);
    });
});

describe('isOnShoppingList', () => {
    it('finds it by name, whatever the case or spaces', () => {
        expect(isOnShoppingList([{ name: 'Gas butano ' }], 'gas BUTANO')).toBe(true);
        expect(isOnShoppingList([{ name: 'Agua' }], 'Gas butano')).toBe(false);
    });
});

describe('listsForTrip', () => {
    it('finds the lists linked to a trip', () => {
        const lists = [{ id: 'a', itinerary: { id: 't1' } }, { id: 'b', itinerary: null }, { id: 'c', itinerary: { id: 't2' } }];

        expect(listsForTrip(lists, 't1').map(list => list.id)).toEqual(['a']);
    });
});

describe('tripsToLinkTo', () => {
    it('puts the trips ahead first, soonest first, then the past ones, latest first', () => {
        const trips = [
            { id: 'past-old', startDate: '2026-03-01', endDate: '2026-03-05' },
            { id: 'later', startDate: '2026-12-01', endDate: '2026-12-10' },
            { id: 'ongoing', startDate: '2026-09-25', endDate: '2026-10-01' },
            { id: 'past-recent', startDate: '2026-08-01', endDate: '2026-08-04' },
        ];

        expect(tripsToLinkTo(trips, '2026-09-28').map(trip => trip.id)).toEqual(['ongoing', 'later', 'past-recent', 'past-old']);
    });

    it('places an experience with a date among the trips, and the undated ones last by title', () => {
        const trips = [
            { id: 'undated-surf', title: 'Surf', source: 'experience', startDate: null, endDate: null },
            { id: 'undated-atlas', title: 'Atlas', source: 'experience', startDate: null, endDate: null },
            { id: 'later', title: 'Alpes', startDate: '2026-12-01', endDate: '2026-12-10' },
            { id: 'dated-experience', title: 'Marruecos', source: 'experience', startDate: '2026-10-05', endDate: '2026-10-09' },
            { id: 'past', title: 'Picos', startDate: '2026-03-01', endDate: '2026-03-05' },
        ];

        expect(tripsToLinkTo(trips, '2026-09-28').map(trip => trip.id))
            .toEqual(['dated-experience', 'later', 'past', 'undated-atlas', 'undated-surf']);
    });
});


describe('copyListName', () => {
    const nameCopy = name => `${name} (copia)`;

    it('names the copy after the original', () => {
        expect(copyListName('Finde', nameCopy)).toBe('Finde (copia)');
    });

    // Regression: a long name plus " (copia)" went over the limit and the
    // server refused to duplicate the list.
    it('shortens a long name so the copy still fits', () => {
        const copy = copyListName('x'.repeat(PACKING_LIST_NAME_MAX_LENGTH), nameCopy);

        expect(copy).toHaveLength(PACKING_LIST_NAME_MAX_LENGTH);
        expect(copy.endsWith(' (copia)')).toBe(true);
    });
});
