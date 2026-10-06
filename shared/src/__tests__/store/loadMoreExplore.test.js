import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { loadMoreExploreItineraries } from '../../store/itineraries/itinerariesActions.js';
import { itinerariesReducer } from '../../store/itineraries/itinerariesReducer.js';

const FIRST_PAGE = [{ id: 'a' }, { id: 'b' }];

const runThunk = async (state, thunk) => {
    let current = state;
    const dispatch = (action) => {
        current = itinerariesReducer(current, action);
    };
    const result = await thunk(dispatch);
    return { state: current, result };
};

const exploreAfterFirstPage = () =>
    itinerariesReducer(undefined, {
        type: '@exploreItineraries/setItineraries',
        payload: { itineraries: FIRST_PAGE, totalPages: 3, totalItems: 6, page: 1 },
    });

beforeEach(() => {
    setApiUrl('http://api.test');
    setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
});

describe('loadMoreExploreItineraries', () => {
    // Regression: a failed "load more" left the spinner on forever, replaced the list with the
    // error view, and (on web, which moves the page first) skipped a page when retrying.
    it('keeps the loaded trips, stops loading and goes back to the previous page when the request fails', async () => {
        global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
        const before = exploreAfterFirstPage();
        const moved = itinerariesReducer(before, { type: '@exploreItineraries/setPagination', payload: { page: 2 } });

        const { state, result } = await runThunk(moved, loadMoreExploreItineraries({ page: 2 }));

        expect(result).toBe(false);
        expect(state.exploreItineraries.data).toEqual(FIRST_PAGE);
        expect(state.exploreItineraries.loadingMore).toBe(false);
        expect(state.exploreItineraries.error).toBeNull();
        expect(state.exploreItineraries.page).toBe(1);
    });

    it('appends the next page and reports success', async () => {
        global.fetch = vi.fn(async () => ({
            ok: true,
            json: async () => ({ itineraries: [{ id: 'c' }], totalPages: 3, totalItems: 6 }),
        }));

        const { state, result } = await runThunk(exploreAfterFirstPage(), loadMoreExploreItineraries({ page: 2 }));

        expect(result).toBe(true);
        expect(state.exploreItineraries.data.map((trip) => trip.id)).toEqual(['a', 'b', 'c']);
        expect(state.exploreItineraries.page).toBe(2);
    });
});
