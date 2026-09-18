import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '../../errors/AuthError.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ItineraryService } from '../../services/itineraryService.js';

const makePlace = (id, orderIndex = 0) => ({
  id,
  orderIndex,
  infoPlace: { lat: 40.0, lon: -3.0 },
  toDTO: () => ({ id }),
});

const makeItinerary = (overrides = {}) => ({
  id: 'itin-1',
  userId: 'user-1',
  isPublic: true,
  title: 'My trip',
  photoUrl: 'https://example.com/photo.jpg',
  photoPublicId: 'public-id-123',
  places: [],
  images: [],
  addPlace: vi.fn(),
  addImage: vi.fn(),
  toDTO: vi.fn(() => ({ id: 'itin-1', title: 'My trip', places: [] })),
  ...overrides,
});

describe('ItineraryService', () => {
  let service;
  let itinerariesRepository;
  let placesRepository;
  let userRepository;
  let cloudinaryService;
  let aiService;

  beforeEach(() => {
    itinerariesRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      linkPlace: vi.fn(),
      unlinkPlace: vi.fn(),
      updatePlaceOrder: vi.fn(),
      linkImage: vi.fn(),
      unlinkImage: vi.fn(),
      getImagesByItineraryId: vi.fn().mockResolvedValue([]),
      getTotalByUserId: vi.fn(),
    };
    placesRepository = {
      getPlacesByItineraryId: vi.fn().mockResolvedValue([]),
      findByPlaceAttributes: vi.fn(),
      insertPlace: vi.fn(),
      updatePlace: vi.fn(),
    };
    userRepository = {};
    cloudinaryService = {
      uploadImageFromBuffer: vi.fn(),
      deleteImage: vi.fn(),
    };
    aiService = {
      generateTextPrompt: vi.fn(),
    };

    service = new ItineraryService(
      itinerariesRepository,
      placesRepository,
      userRepository,
      cloudinaryService,
      aiService
    );
  });

  describe('getItineraryById()', () => {
    it('returns itinerary DTO with places attached', async () => {
      const itinerary = makeItinerary();
      const place = makePlace('place-1');
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([place]);

      const result = await service.getItineraryById('itin-1', 'user-1');

      expect(itinerariesRepository.findById).toHaveBeenCalledWith('itin-1');
      expect(placesRepository.getPlacesByItineraryId).toHaveBeenCalledWith('itin-1');
      expect(itinerary.addPlace).toHaveBeenCalledWith(place);
      expect(itinerary.toDTO).toHaveBeenCalled();
      expect(result).toEqual({ id: 'itin-1', title: 'My trip', places: [] });
    });

    it('throws NotFoundError when itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.getItineraryById('nonexistent', 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('returns a public itinerary to an anonymous requester', async () => {
      const itinerary = makeItinerary({ isPublic: true });
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);

      await expect(service.getItineraryById('itin-1', undefined)).resolves.toBeDefined();
    });

    it('throws NotFoundError for a private itinerary requested by a non-owner', async () => {
      const itinerary = makeItinerary({ isPublic: false });
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await expect(service.getItineraryById('itin-1', 'someone-else'))
        .rejects.toThrow(NotFoundError);
    });

    it('returns a private itinerary to its owner', async () => {
      const itinerary = makeItinerary({ isPublic: false });
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);

      await expect(service.getItineraryById('itin-1', 'user-1')).resolves.toBeDefined();
    });

    it('attaches gallery images to the itinerary', async () => {
      const itinerary = makeItinerary();
      const image = { id: 'img-1', photoUrl: 'https://cloudinary.com/a.jpg', photoPublicId: 'pub-a', orderIndex: 0 };
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([image]);

      await service.getItineraryById('itin-1', 'user-1');

      expect(itinerariesRepository.getImagesByItineraryId).toHaveBeenCalledWith('itin-1');
      expect(itinerary.addImage).toHaveBeenCalledWith(image);
    });
  });

  describe('cloneItinerary()', () => {
    it('clones a public itinerary from another user', async () => {
      const source = makeItinerary({
        id: 'itin-1',
        userId: 'owner-1',
        isPublic: true,
        photoUrl: 'https://example.com/photo.jpg',
        photoPublicId: 'owner-public-id',
      });
      const clone = makeItinerary({ id: 'itin-2', userId: 'cloner-1' });
      itinerariesRepository.findById.mockResolvedValue(source);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      itinerariesRepository.create.mockResolvedValue(clone);

      const result = await service.cloneItinerary('itin-1', 'cloner-1');

      expect(itinerariesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'cloner-1', isPublic: false, photoPublicId: null, photoUrl: source.photoUrl })
      );
      expect(result).toEqual({ id: 'itin-1', title: 'My trip', places: [] });
    });

    it('throws NotFoundError when the source itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.cloneItinerary('nonexistent', 'cloner-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when cloning a private itinerary owned by someone else', async () => {
      const source = makeItinerary({ userId: 'owner-1', isPublic: false });
      itinerariesRepository.findById.mockResolvedValue(source);

      await expect(service.cloneItinerary('itin-1', 'cloner-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('allows cloning your own private itinerary', async () => {
      const source = makeItinerary({ userId: 'user-1', isPublic: false });
      const clone = makeItinerary({ id: 'itin-2' });
      itinerariesRepository.findById.mockResolvedValue(source);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      itinerariesRepository.create.mockResolvedValue(clone);

      await expect(service.cloneItinerary('itin-1', 'user-1')).resolves.toBeDefined();
    });

    it('re-inserts and links every place from the source itinerary', async () => {
      const source = makeItinerary({ isPublic: true });
      const clone = makeItinerary({ id: 'itin-2' });
      const sourcePlace = {
        name: 'Colosseum', label: 'Ancient arena', latitude: 41.89, longitude: 12.49,
        category: 'monument', orderIndex: 0, dayNumber: 1, description: 'A big arena',
      };
      const insertedPlace = makePlace('place-2', 0);
      itinerariesRepository.findById.mockResolvedValue(source);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([sourcePlace]);
      itinerariesRepository.create.mockResolvedValue(clone);
      placesRepository.insertPlace.mockResolvedValue(insertedPlace);

      await service.cloneItinerary('itin-1', 'cloner-1');

      expect(placesRepository.insertPlace).toHaveBeenCalledWith(
        expect.objectContaining({
          infoPlace: { name: 'Colosseum', label: 'Ancient arena', lat: 41.89, lon: 12.49 },
          category: 'monument',
          dayNumber: 1,
        })
      );
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledWith('itin-2', 'place-2', 0, 1, 'A big arena');
      expect(clone.addPlace).toHaveBeenCalledWith(insertedPlace);
    });

    it('rewards the referral when the clone is the cloner\'s first ever itinerary', async () => {
      const source = makeItinerary({ isPublic: true });
      const clone = makeItinerary({ id: 'itin-2' });
      const referralService = { rewardFirstItinerary: vi.fn().mockResolvedValue(undefined) };
      const serviceWithReferral = new ItineraryService(
        itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService,
        null, referralService
      );
      itinerariesRepository.findById.mockResolvedValue(source);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      itinerariesRepository.create.mockResolvedValue(clone);
      itinerariesRepository.getTotalByUserId.mockResolvedValue(1);

      await serviceWithReferral.cloneItinerary('itin-1', 'cloner-1');

      expect(referralService.rewardFirstItinerary).toHaveBeenCalledWith('cloner-1', 'itin-2');
    });
  });

  describe('createItinerary()', () => {
    const baseData = {
      userId: 'user-1',
      title: 'New Trip',
      places: [],
    };

    it('creates itinerary without image when no file provided', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.create.mockResolvedValue(itinerary);

      await service.createItinerary(baseData, null, [], 'user-1');

      expect(cloudinaryService.uploadImageFromBuffer).not.toHaveBeenCalled();
      expect(itinerariesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: '', photoPublicId: '' })
      );
    });

    it('ignores a client-supplied userId and uses the authenticated user instead', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.create.mockResolvedValue(itinerary);

      await service.createItinerary({ ...baseData, userId: 'attacker-id' }, null, [], 'user-1');

      expect(itinerariesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
    });

    it('uploads image to cloudinary when file is provided', async () => {
      const itinerary = makeItinerary();
      cloudinaryService.uploadImageFromBuffer.mockResolvedValue({
        secure_url: 'https://cloudinary.com/image.jpg',
        public_id: 'cloud-public-id',
      });
      itinerariesRepository.create.mockResolvedValue(itinerary);

      const file = { buffer: Buffer.from('img'), originalname: 'photo.jpg' };
      await service.createItinerary(baseData, file, [], 'user-1');

      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledWith(file.buffer);
      expect(itinerariesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: 'https://cloudinary.com/image.jpg',
          photoPublicId: 'cloud-public-id',
        })
      );
    });

    it('links each place to the itinerary after creation', async () => {
      const place1 = makePlace('place-1', 0);
      const place2 = makePlace('place-2', 1);
      const itinerary = makeItinerary();
      const dataWithPlaces = { ...baseData, places: [place1, place2] };

      itinerariesRepository.create.mockResolvedValue(itinerary);
      placesRepository.findByPlaceAttributes.mockResolvedValue(null);
      placesRepository.insertPlace.mockResolvedValueOnce({ id: 'place-1', toDTO: () => ({}) })
        .mockResolvedValueOnce({ id: 'place-2', toDTO: () => ({}) });

      await service.createItinerary(dataWithPlaces, null, [], 'user-1');

      expect(placesRepository.insertPlace).toHaveBeenCalledTimes(2);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledTimes(2);
    });

    it('always inserts a new place', async () => {
      const place = makePlace('place-1', 0);
      const dataWithPlaces = { ...baseData, places: [place] };
      const itinerary = makeItinerary();

      itinerariesRepository.create.mockResolvedValue(itinerary);
      placesRepository.insertPlace.mockResolvedValue({ id: 'place-1', toDTO: () => ({}) });

      await service.createItinerary(dataWithPlaces, null, [], 'user-1');

      expect(placesRepository.insertPlace).toHaveBeenCalledTimes(1);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledWith('itin-1', 'place-1', 0, 1, null);
    });

    it('throws ConflictError when repository fails to create', async () => {
      itinerariesRepository.create.mockResolvedValue(null);

      await expect(service.createItinerary(baseData, null, [], 'user-1'))
        .rejects.toThrow(ConflictError);
    });

    it('uploads and links each gallery image, in order', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.create.mockResolvedValue(itinerary);
      cloudinaryService.uploadImageFromBuffer
        .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/a.jpg', public_id: 'pub-a' })
        .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/b.jpg', public_id: 'pub-b' });
      itinerariesRepository.linkImage
        .mockResolvedValueOnce({ id: 'img-a', photoUrl: 'https://cloudinary.com/a.jpg', photoPublicId: 'pub-a', orderIndex: 0 })
        .mockResolvedValueOnce({ id: 'img-b', photoUrl: 'https://cloudinary.com/b.jpg', photoPublicId: 'pub-b', orderIndex: 1 });

      const images = [{ buffer: Buffer.from('a') }, { buffer: Buffer.from('b') }];
      await service.createItinerary(baseData, null, images, 'user-1');

      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledTimes(2);
      expect(itinerariesRepository.linkImage).toHaveBeenNthCalledWith(1, 'itin-1', 'https://cloudinary.com/a.jpg', 'pub-a', 0);
      expect(itinerariesRepository.linkImage).toHaveBeenNthCalledWith(2, 'itin-1', 'https://cloudinary.com/b.jpg', 'pub-b', 1);
      expect(itinerary.addImage).toHaveBeenCalledTimes(2);
    });

    describe('referral reward (via ReferralService)', () => {
      let referralService;
      let serviceWithReferral;

      beforeEach(() => {
        referralService = { rewardFirstItinerary: vi.fn().mockResolvedValue(undefined) };
        serviceWithReferral = new ItineraryService(
          itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService,
          null, referralService
        );
      });

      it('rewards the referral when this is the user\'s first ever itinerary', async () => {
        itinerariesRepository.create.mockResolvedValue(makeItinerary());
        itinerariesRepository.getTotalByUserId.mockResolvedValue(1);

        await serviceWithReferral.createItinerary(baseData, null, [], 'user-1');

        expect(referralService.rewardFirstItinerary).toHaveBeenCalledWith('user-1', 'itin-1');
      });

      it('does not reward when the user already has other itineraries', async () => {
        itinerariesRepository.create.mockResolvedValue(makeItinerary());
        itinerariesRepository.getTotalByUserId.mockResolvedValue(2);

        await serviceWithReferral.createItinerary(baseData, null, [], 'user-1');

        expect(referralService.rewardFirstItinerary).not.toHaveBeenCalled();
      });

      it('does not touch the referral repository at all without a ReferralService', async () => {
        itinerariesRepository.create.mockResolvedValue(makeItinerary());

        await service.createItinerary(baseData, null, [], 'user-1');

        expect(itinerariesRepository.getTotalByUserId).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteItinerary()', () => {
    it('throws NotFoundError when itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.deleteItinerary('nonexistent', 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('throws AuthError when the requester does not own the itinerary', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await expect(service.deleteItinerary('itin-1', 'someone-else'))
        .rejects.toThrow(AuthError);
      expect(itinerariesRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes cloudinary image when photoPublicId exists', async () => {
      const itinerary = makeItinerary({ photoPublicId: 'some-public-id' });
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await service.deleteItinerary('itin-1', 'user-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('some-public-id');
      expect(itinerariesRepository.delete).toHaveBeenCalledWith('itin-1');
    });

    it('skips cloudinary deletion when no photoPublicId', async () => {
      const itinerary = makeItinerary({ photoPublicId: null });
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await service.deleteItinerary('itin-1', 'user-1');

      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
      expect(itinerariesRepository.delete).toHaveBeenCalledWith('itin-1');
    });

    it('deletes every gallery image from cloudinary before deleting the itinerary', async () => {
      const itinerary = makeItinerary({ photoPublicId: null });
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a' },
        { id: 'img-b', photoPublicId: 'pub-b' },
      ]);

      await service.deleteItinerary('itin-1', 'user-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub-a');
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub-b');
      expect(itinerariesRepository.delete).toHaveBeenCalledWith('itin-1');
    });
  });

  describe('updateItinerary()', () => {
    const baseUpdateData = {
      title: 'Updated Trip',
      places: [],
    };

    it('throws NotFoundError when itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.updateItinerary('nonexistent', baseUpdateData, null, [], 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('throws AuthError when the requester does not own the itinerary', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await expect(service.updateItinerary('itin-1', { ...baseUpdateData }, null, [], 'someone-else'))
        .rejects.toThrow(AuthError);
      expect(itinerariesRepository.update).not.toHaveBeenCalled();
    });

    it('preserves existing image when no new file is provided', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);

      await service.updateItinerary('itin-1', { ...baseUpdateData }, null, [], 'user-1');

      expect(cloudinaryService.uploadImageFromBuffer).not.toHaveBeenCalled();
      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
      expect(itinerariesRepository.update).toHaveBeenCalledWith(
        'itin-1',
        expect.objectContaining({
          photoUrl: 'https://example.com/photo.jpg',
          photoPublicId: 'public-id-123',
        })
      );
    });

    it('deletes old image and uploads new one when file is provided', async () => {
      const itinerary = makeItinerary({ photoPublicId: 'old-public-id' });
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      cloudinaryService.uploadImageFromBuffer.mockResolvedValue({
        secure_url: 'https://cloudinary.com/new.jpg',
        public_id: 'new-public-id',
      });

      const file = { buffer: Buffer.from('img'), originalname: 'new.jpg' };
      await service.updateItinerary('itin-1', { ...baseUpdateData }, file, [], 'user-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('old-public-id');
      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledWith(file.buffer);
      expect(itinerariesRepository.update).toHaveBeenCalledWith(
        'itin-1',
        expect.objectContaining({
          photoUrl: 'https://cloudinary.com/new.jpg',
          photoPublicId: 'new-public-id',
        })
      );
    });

    it('uploads new image without deleting when itinerary has no previous image', async () => {
      const itinerary = makeItinerary({ photoPublicId: null, photoUrl: '' });
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      cloudinaryService.uploadImageFromBuffer.mockResolvedValue({
        secure_url: 'https://cloudinary.com/first.jpg',
        public_id: 'first-public-id',
      });

      const file = { buffer: Buffer.from('img'), originalname: 'first.jpg' };
      await service.updateItinerary('itin-1', { ...baseUpdateData }, file, [], 'user-1');

      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalled();
    });

    it('unlinks places removed from the itinerary', async () => {
      const existing1 = makePlace('place-1', 0);
      const existing2 = makePlace('place-2', 1);
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([existing1, existing2]);

      // Only place-1 remains in the update
      const updateData = { ...baseUpdateData, places: [{ id: 'place-1', orderIndex: 0 }] };
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(itinerariesRepository.unlinkPlace).toHaveBeenCalledWith('itin-1', 'place-2');
      expect(itinerariesRepository.unlinkPlace).not.toHaveBeenCalledWith('itin-1', 'place-1');
    });

    it('updates order of existing places', async () => {
      const existing = makePlace('place-1', 0);
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([existing]);

      const placeUpdate = { id: 'place-1', orderIndex: 2 };
      const updateData = { ...baseUpdateData, places: [placeUpdate] };
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(placesRepository.updatePlace).toHaveBeenCalledWith(placeUpdate);
      expect(itinerariesRepository.updatePlaceOrder).toHaveBeenCalledWith('itin-1', { ...placeUpdate, description: null });
    });

    it('inserts and links new places not previously in the itinerary', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      placesRepository.insertPlace.mockResolvedValue({ id: 'new-place', toDTO: () => ({}) });

      const newPlace = { id: undefined, orderIndex: 0, infoPlace: { lat: 1, lon: 2 } };
      const updateData = { ...baseUpdateData, places: [newPlace] };
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(placesRepository.insertPlace).toHaveBeenCalledWith(newPlace);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledWith('itin-1', 'new-place', 0, 1, null);
    });

    it('deletes from cloudinary and unlinks gallery images not in keepImageIds', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a' },
        { id: 'img-b', photoPublicId: 'pub-b' },
      ]);

      const updateData = { ...baseUpdateData, keepImageIds: ['img-a'] };
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub-b');
      expect(cloudinaryService.deleteImage).not.toHaveBeenCalledWith('pub-a');
      expect(itinerariesRepository.unlinkImage).toHaveBeenCalledWith('itin-1', 'img-b');
      expect(itinerariesRepository.unlinkImage).not.toHaveBeenCalledWith('itin-1', 'img-a');
    });

    it('uploads and links new gallery images after the kept ones, without colliding order', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a' },
      ]);
      cloudinaryService.uploadImageFromBuffer.mockResolvedValue({ secure_url: 'https://cloudinary.com/new.jpg', public_id: 'pub-new' });
      itinerariesRepository.linkImage.mockResolvedValue({ id: 'img-new', photoUrl: 'https://cloudinary.com/new.jpg', photoPublicId: 'pub-new', orderIndex: 1 });

      const updateData = { ...baseUpdateData, keepImageIds: ['img-a'] };
      const newImages = [{ buffer: Buffer.from('new') }];
      await service.updateItinerary('itin-1', updateData, null, newImages, 'user-1');

      expect(itinerariesRepository.linkImage).toHaveBeenCalledWith('itin-1', 'https://cloudinary.com/new.jpg', 'pub-new', 1);
    });

    it('leaves the gallery untouched when keepImageIds is not sent at all (e.g. the Experience edit flow)', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a' },
        { id: 'img-b', photoPublicId: 'pub-b' },
      ]);

      const updateData = { ...baseUpdateData }; // no keepImageIds field
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
      expect(itinerariesRepository.unlinkImage).not.toHaveBeenCalled();
    });

    it('deletes every image when keepImageIds is explicitly sent as an empty array', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a' },
      ]);

      const updateData = { ...baseUpdateData, keepImageIds: [] };
      await service.updateItinerary('itin-1', updateData, null, [], 'user-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub-a');
      expect(itinerariesRepository.unlinkImage).toHaveBeenCalledWith('itin-1', 'img-a');
    });

    it('appends new images after the highest surviving order_index instead of keepImageIds.size, even when a non-trailing image was removed', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      itinerariesRepository.getImagesByItineraryId.mockResolvedValue([
        { id: 'img-a', photoPublicId: 'pub-a', orderIndex: 0 },
        { id: 'img-b', photoPublicId: 'pub-b', orderIndex: 1 },
        { id: 'img-c', photoPublicId: 'pub-c', orderIndex: 2 },
      ]);
      cloudinaryService.uploadImageFromBuffer.mockResolvedValue({ secure_url: 'https://cloudinary.com/new.jpg', public_id: 'pub-new' });
      itinerariesRepository.linkImage.mockResolvedValue({ id: 'img-new', photoUrl: 'https://cloudinary.com/new.jpg', photoPublicId: 'pub-new', orderIndex: 3 });

      // remove the middle image (img-b), keep img-a and img-c
      const updateData = { ...baseUpdateData, keepImageIds: ['img-a', 'img-c'] };
      const newImages = [{ buffer: Buffer.from('new') }];
      await service.updateItinerary('itin-1', updateData, null, newImages, 'user-1');

      // keepImageIds.size (2) would collide with kept img-c's own order_index (2); must be 3 instead
      expect(itinerariesRepository.linkImage).toHaveBeenCalledWith('itin-1', 'https://cloudinary.com/new.jpg', 'pub-new', 3);
    });
  });

  describe('generateSmartItinerary()', () => {
    it('returns parsed JSON from AI service', async () => {
      const aiResponse = JSON.stringify([{ day: 1, activities: ['Visit museum'] }]);
      aiService.generateTextPrompt.mockResolvedValue(aiResponse);

      const result = await service.generateSmartItinerary('Tokyo', 3);

      expect(aiService.generateTextPrompt).toHaveBeenCalledWith('Tokyo', 3, {});
      expect(result).toEqual([{ day: 1, activities: ['Visit museum'] }]);
    });

    it('throws descriptive error when AI returns invalid JSON', async () => {
      aiService.generateTextPrompt.mockResolvedValue('not valid json {{');

      await expect(service.generateSmartItinerary('Paris', 2))
        .rejects.toThrow('AI returned invalid JSON for destination "Paris"');
    });

    describe('monthly quota (via the audit log)', () => {
      let auditLogService;
      let serviceWithQuota;
      const actingUser = { id: 'user-1', username: 'jane' };

      beforeEach(() => {
        auditLogService = {
          getFiltered: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
          log: vi.fn(),
        };
        serviceWithQuota = new ItineraryService(
          itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService, auditLogService
        );
      });

      it('generates normally and logs the event when under the monthly limit', async () => {
        aiService.generateTextPrompt.mockResolvedValue(JSON.stringify({ day: 1 }));

        const result = await serviceWithQuota.generateSmartItinerary('Rome', 3, {}, actingUser);

        expect(result).toEqual({ day: 1 });
        expect(auditLogService.log).toHaveBeenCalledWith({
          actorId: 'user-1', actorUsername: 'jane',
          action: 'ai_itinerary_generated',
          metadata: { destination: 'Rome', totalDays: 3 },
        });
      });

      it('checks usage since the start of the current month for that user only', async () => {
        aiService.generateTextPrompt.mockResolvedValue(JSON.stringify({ day: 1 }));

        await serviceWithQuota.generateSmartItinerary('Rome', 3, {}, actingUser);

        const filters = auditLogService.getFiltered.mock.calls[0][0];
        expect(filters.actorId).toBe('user-1');
        expect(filters.action).toBe('ai_itinerary_generated');
        expect(new Date(filters.dateFrom).getDate()).toBe(1);
      });

      it('throws TooManyRequestsError once the monthly limit is reached, without calling the AI', async () => {
        auditLogService.getFiltered.mockResolvedValue({ entries: [], total: 50 });

        await expect(serviceWithQuota.generateSmartItinerary('Rome', 3, {}, actingUser))
          .rejects.toThrow('Monthly AI itinerary limit reached');
        expect(aiService.generateTextPrompt).not.toHaveBeenCalled();
      });

      it('does not check or log usage when no acting user is given (e.g. system/internal calls)', async () => {
        aiService.generateTextPrompt.mockResolvedValue(JSON.stringify({ day: 1 }));

        await serviceWithQuota.generateSmartItinerary('Rome', 3);

        expect(auditLogService.getFiltered).not.toHaveBeenCalled();
        expect(auditLogService.log).not.toHaveBeenCalled();
      });
    });
  });
});
