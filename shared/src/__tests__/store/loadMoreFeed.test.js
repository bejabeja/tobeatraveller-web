import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { initFeed } from '../../store/itineraries/itinerariesActions.js';
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

const feedAfterFirstPage = () =>
    itinerariesReducer(undefined, {
        type: '@feed/set',
        payload: { itineraries: FIRST_PAGE, totalPages: 3, totalItems: 6, page: 1, append: false },
    });

beforeEach(() => {
    setApiUrl('http://api.test');
    setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
});

describe('initFeed', () => {
    it('reports the failure and keeps the loaded trips when loading the next page fails', async () => {
        global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));

        const { state, result } = await runThunk(feedAfterFirstPage(), initFeed(2));

        expect(result).toBe(false);
        expect(state.feed.data).toEqual(FIRST_PAGE);
        expect(state.feed.loadingMore).toBe(false);
    });

    it('appends the next page and reports success', async () => {
        global.fetch = vi.fn(async () => ({
            ok: true,
            json: async () => ({ itineraries: [{ id: 'c' }], totalPages: 3, totalItems: 6, currentPage: 2 }),
        }));

        const { state, result } = await runThunk(feedAfterFirstPage(), initFeed(2));

        expect(result).toBe(true);
        expect(state.feed.data.map((trip) => trip.id)).toEqual(['a', 'b', 'c']);
    });
});
