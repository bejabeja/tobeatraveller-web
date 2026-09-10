import { describe, it, expect, beforeEach } from 'vitest';
import { LifeDiaryService } from '../../services/lifeDiaryService.js';

const makeEntry = (overrides = {}) => ({
    id: 'entry-1',
    userId: 'user-1',
    images: [],
    addImage(image) { this.images.push(image); },
    toDTO() { return { id: this.id, userId: this.userId, entryDate: '2026-03-01', images: this.images }; },
    ...overrides,
});

describe('LifeDiaryService', () => {
    let repository;
    let cloudinaryService;
    let userRepository;
    let service;

    beforeEach(() => {
        repository = {
            create: async (data) => makeEntry({ userId: data.userId }),
            findByUserId: async () => [makeEntry()],
            findById: async () => makeEntry(),
            update: async () => makeEntry(),
            delete: async () => {},
            countByUserId: async () => 0,
            linkImage: async (entryId, photoUrl, photoPublicId, orderIndex) => ({ id: `img-${orderIndex}`, entryId, photoUrl, photoPublicId, orderIndex }),
            unlinkImage: async () => {},
            getImagesByEntryIds: async () => [],
        };
        cloudinaryService = {
            uploadImageFromBuffer: async () => ({ secure_url: 'https://cdn.example.com/photo.jpg', public_id: 'pub-1' }),
            deleteImage: async () => {},
        };
        userRepository = {
            getUserById: async () => ({ role: 'user', isPremium: () => false }),
        };
        service = new LifeDiaryService(repository, cloudinaryService, userRepository);
    });

    describe('createEntry()', () => {
        it('creates the entry for the given user', async () => {
            const result = await service.createEntry({ entryDate: '2026-03-01' }, [], 'user-1');

            expect(result.userId).toBe('user-1');
        });

        it('throws a ForbiddenError tagged "lifeDiaryCap" once a free user already has 10 entries', async () => {
            repository.countByUserId = async () => 10;

            await expect(service.createEntry({ entryDate: '2026-03-01' }, [], 'user-1')).rejects.toMatchObject({
                statusCode: 403,
                field: 'lifeDiaryCap',
            });
        });

        it('lets a premium user past the free-tier cap', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });
            repository.countByUserId = async () => 50;

            const result = await service.createEntry({ entryDate: '2026-03-01' }, [], 'user-1');

            expect(result.userId).toBe('user-1');
        });

        it('lets staff past the free-tier cap', async () => {
            userRepository.getUserById = async () => ({ role: 'admin', isPremium: () => false });
            repository.countByUserId = async () => 50;

            const result = await service.createEntry({ entryDate: '2026-03-01' }, [], 'user-1');

            expect(result.userId).toBe('user-1');
        });

        it('uploads and links every provided file to the new entry', async () => {
            const linked = [];
            repository.linkImage = async (entryId, photoUrl, photoPublicId, orderIndex) => {
                const image = { id: `img-${orderIndex}`, entryId, photoUrl, photoPublicId, orderIndex };
                linked.push(image);
                return image;
            };

            const result = await service.createEntry({ entryDate: '2026-03-01' }, [{ buffer: Buffer.from('a') }, { buffer: Buffer.from('b') }], 'user-1');

            expect(linked).toHaveLength(2);
            expect(result.images).toHaveLength(2);
        });
    });

    describe('getFreeTierUsage()', () => {
        it('reports how many entries a free user has used', async () => {
            repository.countByUserId = async () => 4;

            const usage = await service.getFreeTierUsage('user-1');

            expect(usage).toEqual({ limited: true, used: 4, limit: 10 });
        });

        it('reports an unlimited free tier for premium users, with no used count', async () => {
            userRepository.getUserById = async () => ({ role: 'user', isPremium: () => true });

            const usage = await service.getFreeTierUsage('user-1');

            expect(usage).toEqual({ limited: false, used: null, limit: 10 });
        });
    });

    describe('getEntriesByUser()', () => {
        it('returns the DTOs for every entry belonging to the user', async () => {
            const result = await service.getEntriesByUser('user-1');

            expect(result).toEqual([{ id: 'entry-1', userId: 'user-1', entryDate: '2026-03-01', images: [] }]);
        });

        it('attaches each entry only the images that belong to it', async () => {
            repository.findByUserId = async () => [makeEntry({ id: 'entry-1' }), makeEntry({ id: 'entry-2' })];
            repository.getImagesByEntryIds = async () => ([
                { id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cdn.example.com/1.jpg' },
                { id: 'img-2', entryId: 'entry-2', photoUrl: 'https://cdn.example.com/2.jpg' },
            ]);

            const result = await service.getEntriesByUser('user-1');

            expect(result.find(e => e.id === 'entry-1').images).toEqual([{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cdn.example.com/1.jpg' }]);
            expect(result.find(e => e.id === 'entry-2').images).toEqual([{ id: 'img-2', entryId: 'entry-2', photoUrl: 'https://cdn.example.com/2.jpg' }]);
        });
    });

    describe('updateEntry() / deleteEntry()', () => {
        it('throws NotFoundError when the entry does not exist', async () => {
            repository.findById = async () => null;

            await expect(service.updateEntry('missing', {}, [], 'user-1')).rejects.toThrow('Life diary entry not found');
            await expect(service.deleteEntry('missing', 'user-1')).rejects.toThrow('Life diary entry not found');
        });

        it('throws AuthError when the entry belongs to a different user', async () => {
            repository.findById = async () => makeEntry({ userId: 'someone-else' });

            await expect(service.updateEntry('entry-1', {}, [], 'user-1')).rejects.toThrow('Unauthorized');
            await expect(service.deleteEntry('entry-1', 'user-1')).rejects.toThrow('Unauthorized');
        });

        it('updates the entry when the requester owns it', async () => {
            const result = await service.updateEntry('entry-1', { bestMoment: 'Sunrise over the lake' }, [], 'user-1');

            expect(result.id).toBe('entry-1');
        });

        it('deletes an image no longer in keepImageIds and unlinks it', async () => {
            repository.getImagesByEntryIds = async () => ([{ id: 'img-1', entryId: 'entry-1', photoUrl: 'x', photoPublicId: 'pub-1' }]);
            let deletedPublicId, unlinkedId;
            cloudinaryService.deleteImage = async (publicId) => { deletedPublicId = publicId; };
            repository.unlinkImage = async (entryId, imageId) => { unlinkedId = imageId; };

            await service.updateEntry('entry-1', { keepImageIds: [] }, [], 'user-1');

            expect(deletedPublicId).toBe('pub-1');
            expect(unlinkedId).toBe('img-1');
        });

        it('keeps an image whose id is in keepImageIds', async () => {
            repository.getImagesByEntryIds = async () => ([{ id: 'img-1', entryId: 'entry-1', photoUrl: 'x', photoPublicId: 'pub-1' }]);
            let unlinkCalled = false;
            repository.unlinkImage = async () => { unlinkCalled = true; };

            await service.updateEntry('entry-1', { keepImageIds: ['img-1'] }, [], 'user-1');

            expect(unlinkCalled).toBe(false);
        });

        it('leaves every image untouched when keepImageIds is not sent at all', async () => {
            repository.getImagesByEntryIds = async () => ([{ id: 'img-1', entryId: 'entry-1', photoUrl: 'x', photoPublicId: 'pub-1' }]);
            let unlinkCalled = false, deleteCalled = false;
            repository.unlinkImage = async () => { unlinkCalled = true; };
            cloudinaryService.deleteImage = async () => { deleteCalled = true; };

            await service.updateEntry('entry-1', { bestMoment: 'Updated text' }, [], 'user-1');

            expect(unlinkCalled).toBe(false);
            expect(deleteCalled).toBe(false);
        });

        it('deletes the entry when the requester owns it', async () => {
            let deletedId;
            repository.delete = async (id) => { deletedId = id; };

            await service.deleteEntry('entry-1', 'user-1');

            expect(deletedId).toBe('entry-1');
        });

        it('deletes every remaining image from cloudinary before deleting the entry', async () => {
            repository.getImagesByEntryIds = async () => ([
                { id: 'img-1', photoPublicId: 'pub-1' },
                { id: 'img-2', photoPublicId: 'pub-2' },
            ]);
            const deletedPublicIds = [];
            cloudinaryService.deleteImage = async (publicId) => { deletedPublicIds.push(publicId); };

            await service.deleteEntry('entry-1', 'user-1');

            expect(deletedPublicIds).toEqual(['pub-1', 'pub-2']);
        });
    });
});
