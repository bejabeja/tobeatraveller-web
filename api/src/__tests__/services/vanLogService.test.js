import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VanLogService } from '../../services/vanLogService.js';

const makeEntry = (overrides = {}) => ({
    id: 'entry-1',
    userId: 'user-1',
    receiptPhotoUrl: null,
    receiptPhotoPublicId: null,
    toDTO() { return { id: this.id, userId: this.userId, category: 'fuel', receiptPhotoUrl: this.receiptPhotoUrl }; },
    ...overrides,
});

const makeItinerary = (overrides = {}) => ({ id: 'trip-1', userId: 'user-1', ...overrides });

describe('VanLogService', () => {
    let repository;
    let cloudinaryService;
    let itineraryRepository;
    let userRepository;
    let service;

    beforeEach(() => {
        repository = {
            create: async (data) => makeEntry({ userId: data.userId }),
            findById: async () => makeEntry(),
            update: async () => makeEntry(),
            delete: async () => {},
            updateReceiptPhoto: async () => makeEntry(),
            countByUserId: async () => 0,
            getTotalsByCategory: async () => [],
            getTotalsByCountry: async () => [],
            getTotalsByTrip: async () => [],
            getDistinctCurrencies: async () => [],
        };
        cloudinaryService = {
            uploadImageFromBuffer: async () => ({ secure_url: 'https://cdn.example.com/photo.jpg', public_id: 'van-log-receipts/photo' }),
            deleteImage: async () => {},
        };
        itineraryRepository = {
            findById: async () => makeItinerary(),
        };
        userRepository = {
            getUserById: async () => ({ role: 'user', isPremium: () => false }),
        };
        service = new VanLogService(repository, cloudinaryService, itineraryRepository, userRepository);
    });

    describe('createEntry()', () => {
        it('checks for new badges once the entry is created', async () => {
            const badgeService = { evaluateUserInBackground: vi.fn() };
            service = new VanLogService(repository, cloudinaryService, itineraryRepository, userRepository, badgeService);

            await service.createEntry({ category: 'fuel' }, 'user-1');

            expect(badgeService.evaluateUserInBackground).toHaveBeenCalledWith('user-1');
        });

        it('does not check badges again when a replayed create returns the existing entry', async () => {
            const badgeService = { evaluateUserInBackground: vi.fn() };
            service = new VanLogService(repository, cloudinaryService, itineraryRepository, userRepository, badgeService);
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

        it('creates the entry linked to a trip the requester owns', async () => {
            let createArgs;
            repository.create = async (data) => { createArgs = data; return makeEntry(); };

            await service.createEntry({ category: 'fuel', itineraryId: 'trip-1' }, 'user-1');

            expect(createArgs.itineraryId).toBe('trip-1');
        });

        it('throws AuthError when the trip belongs to a different user', async () => {
            itineraryRepository.findById = async () => makeItinerary({ userId: 'someone-else' });

            await expect(service.createEntry({ category: 'fuel', itineraryId: 'trip-1' }, 'user-1'))
                .rejects.toThrow('Unauthorized');
        });

        it('throws NotFoundError when the trip does not exist', async () => {
            itineraryRepository.findById = async () => null;

            await expect(service.createEntry({ category: 'fuel', itineraryId: 'missing-trip' }, 'user-1'))
                .rejects.toThrow('Itinerary not found');
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

        it('links the entry to a trip the requester owns', async () => {
            let updateArgs;
            repository.update = async (id, data) => { updateArgs = data; return makeEntry(); };

            await service.updateEntry('entry-1', { category: 'fuel', itineraryId: 'trip-1' }, 'user-1');

            expect(updateArgs.itineraryId).toBe('trip-1');
        });

        it('throws AuthError when linking to a trip that belongs to a different user', async () => {
            itineraryRepository.findById = async () => makeItinerary({ userId: 'someone-else' });

            await expect(service.updateEntry('entry-1', { category: 'fuel', itineraryId: 'trip-1' }, 'user-1'))
                .rejects.toThrow('Unauthorized');
        });

        it('deletes the receipt photo from storage when the entry has one', async () => {
            repository.findById = async () => makeEntry({ receiptPhotoPublicId: 'van-log-receipts/old' });
            const deleteImage = vi.fn(async () => {});
            cloudinaryService.deleteImage = deleteImage;

            await service.deleteEntry('entry-1', 'user-1');

            expect(deleteImage).toHaveBeenCalledWith('van-log-receipts/old');
        });

        it('does not call storage deletion when the entry has no receipt photo', async () => {
            const deleteImage = vi.fn(async () => {});
            cloudinaryService.deleteImage = deleteImage;

            await service.deleteEntry('entry-1', 'user-1');

            expect(deleteImage).not.toHaveBeenCalled();
        });
    });

    describe('setReceiptPhoto()', () => {
        it('uploads the file and stores the resulting url and public id', async () => {
            cloudinaryService.uploadImageFromBuffer = vi.fn(async () => (
                { secure_url: 'https://cdn.example.com/new.jpg', public_id: 'van-log-receipts/new' }
            ));
            let savedArgs;
            repository.updateReceiptPhoto = async (id, data) => {
                savedArgs = { id, data };
                return makeEntry({ receiptPhotoUrl: data.url });
            };

            const result = await service.setReceiptPhoto('entry-1', 'user-1', { buffer: Buffer.from('fake-image') });

            expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledWith(expect.any(Buffer), 'van-log-receipts');
            expect(savedArgs).toEqual({
                id: 'entry-1',
                data: { url: 'https://cdn.example.com/new.jpg', publicId: 'van-log-receipts/new' },
            });
            expect(result.receiptPhotoUrl).toBe('https://cdn.example.com/new.jpg');
        });

        it('deletes the previous photo before uploading a replacement', async () => {
            repository.findById = async () => makeEntry({ receiptPhotoPublicId: 'van-log-receipts/old' });
            const deleteImage = vi.fn(async () => {});
            cloudinaryService.deleteImage = deleteImage;

            await service.setReceiptPhoto('entry-1', 'user-1', { buffer: Buffer.from('fake-image') });

            expect(deleteImage).toHaveBeenCalledWith('van-log-receipts/old');
        });

        it('throws AuthError when the entry belongs to a different user', async () => {
            repository.findById = async () => makeEntry({ userId: 'someone-else' });

            await expect(service.setReceiptPhoto('entry-1', 'user-1', { buffer: Buffer.from('x') }))
                .rejects.toThrow('Unauthorized');
        });

        it('throws NotFoundError when the entry does not exist', async () => {
            repository.findById = async () => null;

            await expect(service.setReceiptPhoto('missing', 'user-1', { buffer: Buffer.from('x') }))
                .rejects.toThrow('Van log entry not found');
        });
    });

    describe('removeReceiptPhoto()', () => {
        it('deletes the photo from storage and clears both columns', async () => {
            repository.findById = async () => makeEntry({ receiptPhotoPublicId: 'van-log-receipts/old' });
            const deleteImage = vi.fn(async () => {});
            cloudinaryService.deleteImage = deleteImage;
            let savedArgs;
            repository.updateReceiptPhoto = async (id, data) => {
                savedArgs = data;
                return makeEntry({ receiptPhotoUrl: null, receiptPhotoPublicId: null });
            };

            const result = await service.removeReceiptPhoto('entry-1', 'user-1');

            expect(deleteImage).toHaveBeenCalledWith('van-log-receipts/old');
            expect(savedArgs).toEqual({ url: null, publicId: null });
            expect(result.receiptPhotoUrl).toBeNull();
        });

        it('does not call storage deletion when the entry has no receipt photo to remove', async () => {
            const deleteImage = vi.fn(async () => {});
            cloudinaryService.deleteImage = deleteImage;

            await service.removeReceiptPhoto('entry-1', 'user-1');

            expect(deleteImage).not.toHaveBeenCalled();
        });
    });

    describe('getStats()', () => {
        it('includes the per-trip breakdown alongside category and country', async () => {
            repository.getTotalsByTrip = async () => ([
                { tripId: 'trip-1', tripTitle: 'Road to the Alps', currency: 'EUR', total: 210, count: 4 },
            ]);

            const stats = await service.getStats('user-1');

            expect(stats.byTrip).toEqual([
                { tripId: 'trip-1', tripTitle: 'Road to the Alps', currency: 'EUR', total: 210, count: 4 },
            ]);
        });

        it('drops the trip filter for the per-trip totals query, so the trip picker keeps listing every trip', async () => {
            const receivedFilters = [];
            repository.getTotalsByTrip = async (userId, filters) => { receivedFilters.push(filters); return []; };

            const filters = { category: 'fuel', itineraryId: 'trip-1', dateFrom: '2026-08-01' };
            await service.getStats('user-1', filters);

            expect(receivedFilters).toEqual([{ category: 'fuel', dateFrom: '2026-08-01' }]);
        });

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
