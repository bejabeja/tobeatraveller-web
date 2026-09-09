import { describe, it, expect, beforeEach } from 'vitest';
import { VanLogService } from '../../services/vanLogService.js';

const makeEntry = (overrides = {}) => ({
    id: 'entry-1',
    userId: 'user-1',
    toDTO() { return { id: this.id, userId: this.userId, category: 'fuel' }; },
    ...overrides,
});

describe('VanLogService', () => {
    let repository;
    let service;

    beforeEach(() => {
        repository = {
            create: async (data) => makeEntry({ userId: data.userId }),
            findById: async () => makeEntry(),
            update: async () => makeEntry(),
            delete: async () => {},
            getTotalsByCategory: async () => [],
            getTotalsByCountry: async () => [],
            getDistinctCurrencies: async () => [],
        };
        service = new VanLogService(repository);
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
