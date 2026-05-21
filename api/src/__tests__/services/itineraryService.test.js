import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  title: 'My trip',
  photoUrl: 'https://example.com/photo.jpg',
  photoPublicId: 'public-id-123',
  places: [],
  addPlace: vi.fn(),
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
    };
    placesRepository = {
      getPlacesByItineraryId: vi.fn(),
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

      const result = await service.getItineraryById('itin-1');

      expect(itinerariesRepository.findById).toHaveBeenCalledWith('itin-1');
      expect(placesRepository.getPlacesByItineraryId).toHaveBeenCalledWith('itin-1');
      expect(itinerary.addPlace).toHaveBeenCalledWith(place);
      expect(itinerary.toDTO).toHaveBeenCalled();
      expect(result).toEqual({ id: 'itin-1', title: 'My trip', places: [] });
    });

    it('throws NotFoundError when itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.getItineraryById('nonexistent'))
        .rejects.toThrow(NotFoundError);
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

      await service.createItinerary(baseData, null);

      expect(cloudinaryService.uploadImageFromBuffer).not.toHaveBeenCalled();
      expect(itinerariesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: '', photoPublicId: '' })
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
      await service.createItinerary(baseData, file);

      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledWith(file.buffer, file.originalname);
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

      await service.createItinerary(dataWithPlaces, null);

      expect(placesRepository.insertPlace).toHaveBeenCalledTimes(2);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledTimes(2);
    });

    it('always inserts a new place', async () => {
      const place = makePlace('place-1', 0);
      const dataWithPlaces = { ...baseData, places: [place] };
      const itinerary = makeItinerary();

      itinerariesRepository.create.mockResolvedValue(itinerary);
      placesRepository.insertPlace.mockResolvedValue({ id: 'place-1', toDTO: () => ({}) });

      await service.createItinerary(dataWithPlaces, null);

      expect(placesRepository.insertPlace).toHaveBeenCalledTimes(1);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledWith('itin-1', 'place-1', 0, 1);
    });

    it('throws ConflictError when repository fails to create', async () => {
      itinerariesRepository.create.mockResolvedValue(null);

      await expect(service.createItinerary(baseData, null))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('deleteItinerary()', () => {
    it('throws NotFoundError when itinerary does not exist', async () => {
      itinerariesRepository.findById.mockResolvedValue(null);

      await expect(service.deleteItinerary('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });

    it('deletes cloudinary image when photoPublicId exists', async () => {
      const itinerary = makeItinerary({ photoPublicId: 'some-public-id' });
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await service.deleteItinerary('itin-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('some-public-id');
      expect(itinerariesRepository.delete).toHaveBeenCalledWith('itin-1');
    });

    it('skips cloudinary deletion when no photoPublicId', async () => {
      const itinerary = makeItinerary({ photoPublicId: null });
      itinerariesRepository.findById.mockResolvedValue(itinerary);

      await service.deleteItinerary('itin-1');

      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
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

      await expect(service.updateItinerary('nonexistent', baseUpdateData, null))
        .rejects.toThrow(NotFoundError);
    });

    it('preserves existing image when no new file is provided', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);

      await service.updateItinerary('itin-1', { ...baseUpdateData }, null);

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
      await service.updateItinerary('itin-1', { ...baseUpdateData }, file);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('old-public-id');
      expect(cloudinaryService.uploadImageFromBuffer).toHaveBeenCalledWith(file.buffer, file.originalname);
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
      await service.updateItinerary('itin-1', { ...baseUpdateData }, file);

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
      await service.updateItinerary('itin-1', updateData, null);

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
      await service.updateItinerary('itin-1', updateData, null);

      expect(placesRepository.updatePlace).toHaveBeenCalledWith(placeUpdate);
      expect(itinerariesRepository.updatePlaceOrder).toHaveBeenCalledWith('itin-1', placeUpdate);
    });

    it('inserts and links new places not previously in the itinerary', async () => {
      const itinerary = makeItinerary();
      itinerariesRepository.findById.mockResolvedValue(itinerary);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);
      placesRepository.insertPlace.mockResolvedValue({ id: 'new-place', toDTO: () => ({}) });

      const newPlace = { id: undefined, orderIndex: 0, infoPlace: { lat: 1, lon: 2 } };
      const updateData = { ...baseUpdateData, places: [newPlace] };
      await service.updateItinerary('itin-1', updateData, null);

      expect(placesRepository.insertPlace).toHaveBeenCalledWith(newPlace);
      expect(itinerariesRepository.linkPlace).toHaveBeenCalledWith('itin-1', 'new-place', 0, 1);
    });
  });

  describe('generateSmartItinerary()', () => {
    it('returns parsed JSON from AI service', async () => {
      const aiResponse = JSON.stringify([{ day: 1, activities: ['Visit museum'] }]);
      aiService.generateTextPrompt.mockResolvedValue(aiResponse);

      const result = await service.generateSmartItinerary('Tokyo', 3);

      expect(aiService.generateTextPrompt).toHaveBeenCalledWith('Tokyo', 3);
      expect(result).toEqual([{ day: 1, activities: ['Visit museum'] }]);
    });

    it('throws descriptive error when AI returns invalid JSON', async () => {
      aiService.generateTextPrompt.mockResolvedValue('not valid json {{');

      await expect(service.generateSmartItinerary('Paris', 2))
        .rejects.toThrow('AI returned invalid JSON for destination "Paris"');
    });
  });
});
