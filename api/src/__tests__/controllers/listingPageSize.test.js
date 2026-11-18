import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({ default: { query: vi.fn() } }));

import { ItinerariesController } from '../../controllers/itinerariesController.js';
import { UserController } from '../../controllers/userController.js';

const respond = () => {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    return res;
};

const listings = [
    {
        name: 'trips',
        call: async (query) => {
            const service = { getFilteredItineraries: vi.fn(async () => ({ itineraries: [], totalPages: 0, currentPage: 1, totalCount: 0 })) };
            await new ItinerariesController(service).filterItinerariesBy({ query }, respond(), vi.fn());
            return service.getFilteredItineraries.mock.calls[0][0];
        },
        defaultLimit: 10,
    },
    {
        name: 'travellers',
        call: async (query) => {
            const service = { getFilteredAllUsers: vi.fn(async () => ({ users: [], totalPages: 0, currentPage: 1, totalCount: 0 })) };
            await new UserController(service).getAllUsersFiltered({ query }, respond(), vi.fn());
            return service.getFilteredAllUsers.mock.calls[0][0];
        },
        defaultLimit: 9,
    },
    {
        name: 'users in the admin',
        call: async (query) => {
            const service = { getFilteredAllUsersForAdmin: vi.fn(async () => ({ users: [], totalPages: 0, currentPage: 1, totalCount: 0 })) };
            await new UserController(service).getAllUsersForAdmin({ query }, respond(), vi.fn());
            return service.getFilteredAllUsersForAdmin.mock.calls[0][0];
        },
        defaultLimit: 20,
    },
];

// Regression: the page size was whatever the request asked for, so one request with no
// session could pull every trip or traveller at once (and each trip costs more queries).
describe.each(listings)('the page of $name', ({ call, defaultLimit }) => {
    it('asks for no more than a hundred, whatever the request says', async () => {
        expect((await call({ limit: '100000' })).limit).toBe(100);
    });

    it('asks for the usual page when the size is missing or is not a number', async () => {
        expect((await call({})).limit).toBe(defaultLimit);
        expect((await call({ limit: 'abc' })).limit).toBe(defaultLimit);
    });

    it('asks for at least one', async () => {
        expect((await call({ limit: '-5' })).limit).toBe(1);
    });

    it('starts at the first page when the page is missing, not a number or below one', async () => {
        expect((await call({})).page).toBe(1);
        expect((await call({ page: 'abc' })).page).toBe(1);
        expect((await call({ page: '-3' })).page).toBe(1);
        expect((await call({ page: '4' })).page).toBe(4);
    });
});
