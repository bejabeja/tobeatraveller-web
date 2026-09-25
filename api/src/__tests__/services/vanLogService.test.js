import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VanLogService } from '../../services/vanLogService.js';

const makeEntry = (overrides = {}) => ({
    id: 'entry-1',
    userId: 'user-1',
    toDTO() { return { id: this.id, userId: this.userId, category: 'fuel' }; },
    ...overrides,
});

describe('VanLogService', () => {
    let repository;
    let userRepository;
    let service;

    beforeEach(() => {
        repository = {
            create: async (data) => makeEntry({ userId: data.userId }),
            findById: async () => makeEntry(),
            update: async () => makeEntry(),
            delete: async () => {},
            countByUserId: async () => 0,
            getTotalsByCategory: async () => [],
            getTotalsByCountry: async () => [],
            getDistinctCurrencies: async () => [],
        };
        userRepository = {
            getUserById: async () => ({ role: 'user', isPremium: () => false }),
        };
        service = new VanLogService(repository, userRepository);
    });

    describe('createEntry()', () => {
        it('checks for new badges once the entry is created', async () => {
            const badgeService = { evaluateUserInBackground: vi.fn() };
            service = new VanLogService(repository, userRepository, badgeService);

            await service.createEntry({ category: 'fuel' }, 'user-1');

            expect(badgeService.evaluateUserInBackground).toHaveBeenCalledWith('user-1');
        });

        it('does not check badges again when a replayed create returns the existing entry', async () => {
            const badgeService = { evaluateUserInBackground: vi.fn() };
            service = new VanLogService(repository, userRepository, badgeService);
            repository.findById = async () => makeEntry({ id: 'client-id-1' });

            await service.createEntry({ id: 'client-id-1', category: 'fuel' }, 'user-1');

            expect(badgeService.evaluateUserInBackground).not.toHaveBeenCalled();
        });

        it('returns the entry already created with that client id instead of inserting it again', async () => {
            let created = false;
            repository.create = async () => { created = true; return makeEntry(); };
            repository.findById = async () => makeEntry({ id: 'client-id-1' });

            const result = await service.createEntry({ id: 'client-id-1', category: 'fuel' }, 'user-1');

            expect(result.id).toBe('client-id-1');
            expect(created).toBe(false);
        });

        // A replay of the create that took the user to the cap must not come
        // back as "limit reached": that entry already counts, it isn't new.
        it('returns the already-created entry even when the free-tier cap is now reached', async () => {
            repository.countByUserId = async () => 10;
            repository.findById = async () => makeEntry({ id: 'client-id-1' });

            const result = await service.createEntry({ id: 'client-id-1', category: 'fuel' }, 'user-1');

            expect(result.id).toBe('client-id-1');
        });

        it('creates the entry with the client id when nothing has that id yet', async () => {
            let createArgs;
            repository.findById = async () => null;
            repository.create = async (data) => { createArgs = data; return makeEntry({ id: data.id }); };

            await service.createEntry({ id: 'client-id-1', category: 'fuel' }, 'user-1');

            expect(createArgs.id).toBe('client-id-1');
        });

        it('throws ConflictError when the client id belongs to another user', async () => {
            repository.findById = async () => makeEntry({ id: 'client-id-1', userId: 'someone-else' });

            await expect(service.createEntry({ id: 'client-id-1', category: 'fuel' }, 'user-1'))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('creates the entry when a free user is under the free-tier limit', async () => {
            repository.countByUserId = async () => 9;

            const result = await service.createEntry({ category: 'fuel' }, 'user-1');

            expect(result.userId).toBe('user-1');
        });

        it('throws a ForbiddenError tagged "vanLogCap" once a free user already has 10 entries', async () => {
            repository.countByUserId = async () => 10;

            await expect(service.createEntry({ category: 'fuel' }, 'user-1')).rejects.toMatchObject({
                statusCode: 403,
                field: 'vanLogCap',
            });
        });

        it('lets a premium user past the free-tier cap', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });
            repository.countByUserId = async () => 50;

            const result = await service.createEntry({ category: 'fuel' }, 'user-1');

            expect(result.userId).toBe('user-1');
        });

        it('lets staff past the free-tier cap', async () => {
            userRepository.getUserById = async () => ({ role: 'admin', isPremium: () => false });
            repository.countByUserId = async () => 50;

            const result = await service.createEntry({ category: 'fuel' }, 'user-1');

            expect(result.userId).toBe('user-1');
        });
    });

    describe('updateEntry() / deleteEntry()', () => {
        it('throws NotFoundError when the entry does not exist', async () => {
            repository.findById = async () => null;

            await expect(service.updateEntry('missing', {}, 'user-1')).rejects.toThrow('Van log entry not found');
            await expect(service.deleteEntry('missing', 'user-1')).rejects.toThrow('Van log entry not found');
        });

        it('throws AuthError when the entry belongs to a different user', async () => {
            repository.findById = async () => makeEntry({ userId: 'someone-else' });

            await expect(service.updateEntry('entry-1', {}, 'user-1')).rejects.toThrow('Unauthorized');
            await expect(service.deleteEntry('entry-1', 'user-1')).rejects.toThrow('Unauthorized');
        });

        it('updates the entry when the requester owns it', async () => {
            const result = await service.updateEntry('entry-1', { category: 'water_fresh' }, 'user-1');

            expect(result.id).toBe('entry-1');
        });
    });

    describe('getStats()', () => {
        it('sums the per-category totals into one grand total per currency', async () => {
            repository.getTotalsByCategory = async () => ([
                { category: 'fuel', currency: 'EUR', total: 100, count: 2 },
                { category: 'groceries', currency: 'EUR', total: 40, count: 1 },
            ]);

            const stats = await service.getStats('user-1');

            expect(stats.totalsByCurrency).toEqual([{ currency: 'EUR', total: 140 }]);
            expect(stats.byCategory).toHaveLength(2);
        });

        it('keeps a separate grand total per currency instead of summing different currencies together', async () => {
            repository.getTotalsByCategory = async () => ([
                { category: 'fuel', currency: 'EUR', total: 60, count: 1 },
                { category: 'maintenance', currency: 'USD', total: 120, count: 1 },
            ]);

            const stats = await service.getStats('user-1');

            expect(stats.totalsByCurrency).toEqual([
                { currency: 'EUR', total: 60 },
                { currency: 'USD', total: 120 },
            ]);
        });

        it('excludes rows with no currency (no priced amount) from the grand total', async () => {
            repository.getTotalsByCategory = async () => ([
                { category: 'water_fresh', currency: null, total: 0, count: 1 },
            ]);

            const stats = await service.getStats('user-1');

            expect(stats.totalsByCurrency).toEqual([]);
        });

        it('returns no currency totals when there are no entries', async () => {
            const stats = await service.getStats('user-1');

            expect(stats.totalsByCurrency).toEqual([]);
            expect(stats.byCategory).toEqual([]);
        });

        it('includes how many free-tier entries a free user has used, unfiltered by the active filters', async () => {
            repository.countByUserId = async () => 7;

            const stats = await service.getStats('user-1', { category: 'fuel' });

            expect(stats.freeTierUsage).toEqual({ limited: true, used: 7, limit: 10 });
        });

        it('reports an unlimited free tier for premium users, with no used count', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });

            const stats = await service.getStats('user-1');

            expect(stats.freeTierUsage).toEqual({ limited: false, used: null, limit: 10 });
        });

        it('includes the per-country breakdown alongside the per-category one', async () => {
            repository.getTotalsByCountry = async () => ([
                { country: 'Germany', currency: 'EUR', total: 65.4, count: 1 },
                { country: 'France', currency: 'EUR', total: 30, count: 2 },
            ]);

            const stats = await service.getStats('user-1');

            expect(stats.byCountry).toEqual([
                { country: 'Germany', currency: 'EUR', total: 65.4, count: 1 },
                { country: 'France', currency: 'EUR', total: 30, count: 2 },
            ]);
        });

        it('forwards the active filters to the category totals query, so its stats match the filtered entry list', async () => {
            const receivedFilters = [];
            repository.getTotalsByCategory = async (userId, filters) => { receivedFilters.push(filters); return []; };

            const filters = { category: 'fuel', country: 'France', dateFrom: '2026-08-01', dateTo: '2026-08-31' };
            await service.getStats('user-1', filters);

            expect(receivedFilters).toEqual([filters]);
        });

        it('drops the country filter for the country totals query, so the country picker keeps listing every available country', async () => {
            const receivedFilters = [];
            repository.getTotalsByCountry = async (userId, filters) => { receivedFilters.push(filters); return []; };

            const filters = { category: 'fuel', country: 'France', dateFrom: '2026-08-01', dateTo: '2026-08-31' };
            await service.getStats('user-1', filters);

            expect(receivedFilters).toEqual([{ category: 'fuel', dateFrom: '2026-08-01', dateTo: '2026-08-31' }]);
        });

        it('includes the list of available currencies', async () => {
            repository.getDistinctCurrencies = async () => ['EUR', 'USD'];

            const stats = await service.getStats('user-1');

            expect(stats.availableCurrencies).toEqual(['EUR', 'USD']);
        });

        it('drops the currency filter for the available-currencies query, so the currency picker keeps listing every option', async () => {
            const receivedFilters = [];
            repository.getDistinctCurrencies = async (userId, filters) => { receivedFilters.push(filters); return []; };

            const filters = { category: 'fuel', currency: 'EUR', dateFrom: '2026-08-01', dateTo: '2026-08-31' };
            await service.getStats('user-1', filters);

            expect(receivedFilters).toEqual([{ category: 'fuel', dateFrom: '2026-08-01', dateTo: '2026-08-31' }]);
        });
    });
});
