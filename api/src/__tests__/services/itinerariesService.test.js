import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItinerariesService } from '../../services/itinerariesService.js';

const makeItinerary = (id, userId = 'user-1') => ({
  id,
  userId,
  addUser: vi.fn(),
  addPlace: vi.fn(),
  toSimpleDTO: vi.fn(() => ({ id, userId })),
  toDTO: vi.fn(() => ({ id, userId, places: [] })),
});

const makeUser = (id = 'user-1') => ({
  id,
  toSimpleDTO: vi.fn(() => ({ id, username: 'tester' })),
});

describe('ItinerariesService', () => {
  let service;
  let itinerariesRepository;
  let userRepository;
  let placesRepository;

  beforeEach(() => {
    itinerariesRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByFilters: vi.fn(),
      countByFilters: vi.fn(),
      findTopByLikes: vi.fn(),
    };
    userRepository = {
      getUserById: vi.fn(),
    };
    placesRepository = {
      getPlacesByItineraryId: vi.fn(),
    };

    service = new ItinerariesService(itinerariesRepository, userRepository, placesRepository);
  });

  describe('getFilteredItineraries()', () => {
    const filters = { page: 1, limit: 10 };

    it('returns empty result when no itineraries match', async () => {
      itinerariesRepository.countByFilters.mockResolvedValue(0);
      itinerariesRepository.findByFilters.mockResolvedValue([]);

      const result = await service.getFilteredItineraries(filters);

      expect(result).toEqual({ itineraries: [], totalPages: 0, totalItems: 0, page: 1 });
    });

    it('returns pagination metadata with itineraries', async () => {
      const itin = makeItinerary('itin-1');
      userRepository.getUserById.mockResolvedValue(makeUser());
      itinerariesRepository.countByFilters.mockResolvedValue(25);
      itinerariesRepository.findByFilters.mockResolvedValue([itin]);

      const result = await service.getFilteredItineraries(filters);

      expect(result.totalItems).toBe(25);
      expect(result.totalPages).toBe(3); // ceil(25/10)
      expect(result.page).toBe(1);
      expect(result.itineraries).toHaveLength(1);
    });

    it('enriches each itinerary with its user', async () => {
      const itin = makeItinerary('itin-1', 'user-1');
      const user = makeUser('user-1');
      itinerariesRepository.countByFilters.mockResolvedValue(1);
      itinerariesRepository.findByFilters.mockResolvedValue([itin]);
      userRepository.getUserById.mockResolvedValue(user);

      await service.getFilteredItineraries(filters);

      expect(userRepository.getUserById).toHaveBeenCalledWith('user-1');
      expect(itin.addUser).toHaveBeenCalledWith({ id: 'user-1', username: 'tester' });
    });

    it('skips addUser when user is not found', async () => {
      const itin = makeItinerary('itin-1');
      itinerariesRepository.countByFilters.mockResolvedValue(1);
      itinerariesRepository.findByFilters.mockResolvedValue([itin]);
      userRepository.getUserById.mockResolvedValue(null);

      await service.getFilteredItineraries(filters);

      expect(itin.addUser).not.toHaveBeenCalled();
      expect(itin.toSimpleDTO).toHaveBeenCalled();
    });

    it('uses page 1 as default when filters.page is undefined', async () => {
      itinerariesRepository.countByFilters.mockResolvedValue(0);
      itinerariesRepository.findByFilters.mockResolvedValue([]);

      const result = await service.getFilteredItineraries({ limit: 10 });

      expect(result.page).toBe(1);
    });
  });

  describe('getFeaturedItineraries()', () => {
    it('returns top-liked itineraries enriched with user', async () => {
      const itin1 = makeItinerary('itin-1', 'user-1');
      const itin2 = makeItinerary('itin-2', 'user-1');
      const itin3 = makeItinerary('itin-3', 'user-1');
      const user = makeUser('user-1');
      itinerariesRepository.findTopByLikes.mockResolvedValue([itin1, itin2, itin3]);
      userRepository.getUserById.mockResolvedValue(user);

      const result = await service.getFeaturedItineraries();

      expect(itinerariesRepository.findTopByLikes).toHaveBeenCalledWith(3);
      expect(result).toHaveLength(3);
      expect(itin1.addUser).toHaveBeenCalled();
      expect(itin1.toSimpleDTO).toHaveBeenCalled();
    });

    it('returns fewer results when repo returns fewer than 3', async () => {
      const itin = makeItinerary('itin-1', 'user-1');
      itinerariesRepository.findTopByLikes.mockResolvedValue([itin]);
      userRepository.getUserById.mockResolvedValue(makeUser());

      const result = await service.getFeaturedItineraries();

      expect(result).toHaveLength(1);
    });

    it('skips addUser when user is not found', async () => {
      const itin = makeItinerary('itin-1');
      itinerariesRepository.findTopByLikes.mockResolvedValue([itin]);
      userRepository.getUserById.mockResolvedValue(null);

      await service.getFeaturedItineraries();

      expect(itin.addUser).not.toHaveBeenCalled();
    });
  });

  describe('getItinerariesByUserId()', () => {
    it('returns empty array when user has no itineraries', async () => {
      itinerariesRepository.findByUserId.mockResolvedValue([]);

      const result = await service.getItinerariesByUserId('user-1');

      expect(result).toEqual([]);
      expect(placesRepository.getPlacesByItineraryId).not.toHaveBeenCalled();
    });

    it('returns DTOs with places attached for each itinerary', async () => {
      const itin = makeItinerary('itin-1');
      const place = { id: 'place-1' };
      itinerariesRepository.findByUserId.mockResolvedValue([itin]);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([place]);

      const result = await service.getItinerariesByUserId('user-1');

      expect(placesRepository.getPlacesByItineraryId).toHaveBeenCalledWith('itin-1');
      expect(itin.addPlace).toHaveBeenCalledWith(place);
      expect(itin.toDTO).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('handles multiple itineraries independently', async () => {
      const itin1 = makeItinerary('itin-1');
      const itin2 = makeItinerary('itin-2');
      itinerariesRepository.findByUserId.mockResolvedValue([itin1, itin2]);
      placesRepository.getPlacesByItineraryId.mockResolvedValue([]);

      const result = await service.getItinerariesByUserId('user-1');

      expect(placesRepository.getPlacesByItineraryId).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });
});
