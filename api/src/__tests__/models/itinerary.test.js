import { describe, expect, it } from 'vitest';
import { Itinerary } from '../../models/itinerary.js';

const baseRow = {
  id: 'abc-123',
  user_id: 'user-1',
  title: 'Trip to Japan',
  description: 'An amazing trip',
  location_name: 'Tokyo',
  location_label: 'Tokyo, Japan',
  latitude: 35.6895,
  longitude: 139.6917,
  start_date: new Date('2025-04-01'),
  end_date: new Date('2025-04-10'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
  photo_url: 'https://example.com/photo.jpg',
  photo_public_id: 'cloudinary-id-123',
  budget: 2000,
  number_of_people: 2,
  likes_count: 5,
  comments_count: 3,
  category: 'Adventure',
  currency: 'EUR',
};

describe('Itinerary model', () => {
  describe('fromDb()', () => {
    it('maps all database fields correctly', () => {
      const itinerary = Itinerary.fromDb(baseRow);

      expect(itinerary.id).toBe('abc-123');
      expect(itinerary.userId).toBe('user-1');
      expect(itinerary.title).toBe('Trip to Japan');
      expect(itinerary.description).toBe('An amazing trip');
      expect(itinerary.location).toEqual({
        name: 'Tokyo',
        label: 'Tokyo, Japan',
        lat: 35.6895,
        lon: 139.6917,
      });
      expect(itinerary.photoUrl).toBe('https://example.com/photo.jpg');
      expect(itinerary.photoPublicId).toBe('cloudinary-id-123');
      expect(itinerary.budget).toBe(2000);
      expect(itinerary.numberOfPeople).toBe(2);
      expect(itinerary.likesCount).toBe(5);
      expect(itinerary.commentsCount).toBe(3);
      expect(itinerary.currency).toBe('EUR');
    });

    it('lowercases the category', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      expect(itinerary.category).toBe('adventure');
    });

    it('initializes places as empty array', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      expect(itinerary.places).toEqual([]);
    });

    it('uses placeholder image when photo_url is null', () => {
      const itinerary = Itinerary.fromDb({ ...baseRow, photo_url: null });
      expect(itinerary.photoUrl).toContain('unsplash.com');
    });
  });

  describe('addPlace()', () => {
    it('appends a place to the places array', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      const place = { id: 'place-1', toDTO: () => ({ id: 'place-1' }) };

      itinerary.addPlace(place);

      expect(itinerary.places).toHaveLength(1);
      expect(itinerary.places[0]).toBe(place);
    });

    it('can add multiple places', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      itinerary.addPlace({ id: 'p1', toDTO: () => ({}) });
      itinerary.addPlace({ id: 'p2', toDTO: () => ({}) });

      expect(itinerary.places).toHaveLength(2);
    });
  });

  describe('getTotalDays()', () => {
    it('calculates days correctly (inclusive)', () => {
      const itinerary = Itinerary.fromDb(baseRow); // Apr 1 - Apr 10 = 10 days
      expect(itinerary.getTotalDays()).toBe(10);
    });

    it('returns 1 for a single-day trip', () => {
      const itinerary = Itinerary.fromDb({
        ...baseRow,
        start_date: new Date('2025-06-15'),
        end_date: new Date('2025-06-15'),
      });
      expect(itinerary.getTotalDays()).toBe(1);
    });
  });

  describe('toDTO()', () => {
    it('returns the expected shape', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      const dto = itinerary.toDTO();

      expect(dto).toHaveProperty('id', 'abc-123');
      expect(dto).toHaveProperty('userId', 'user-1');
      expect(dto).toHaveProperty('title', 'Trip to Japan');
      expect(dto).toHaveProperty('location');
      expect(dto).toHaveProperty('places');
      expect(dto).toHaveProperty('tripTotalDays', 10);
      expect(dto).toHaveProperty('tripDates');
      expect(dto).toHaveProperty('budget', 2000);
      expect(dto).toHaveProperty('category', 'adventure');
    });

    it('maps places via their toDTO method', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      const place = { toDTO: () => ({ id: 'place-1', name: 'Shibuya' }) };
      itinerary.addPlace(place);

      const dto = itinerary.toDTO();
      expect(dto.places).toEqual([{ id: 'place-1', name: 'Shibuya' }]);
    });
  });

  describe('toSimpleDTO()', () => {
    it('returns only the simplified fields', () => {
      const itinerary = Itinerary.fromDb(baseRow);
      const dto = itinerary.toSimpleDTO();

      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('title');
      expect(dto).toHaveProperty('photoUrl');
      expect(dto).toHaveProperty('likesCount');
      expect(dto).toHaveProperty('commentsCount');
      expect(dto).not.toHaveProperty('budget');
      expect(dto).not.toHaveProperty('currency');
    });
  });
});
