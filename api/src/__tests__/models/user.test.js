import { describe, it, expect } from 'vitest';
import { User } from '../../models/user.js';

const baseRow = {
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'hashed_password',
    location: 'Madrid',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-06-01'),
    name: 'John Doe',
    bio: 'Traveller at heart',
    about: 'I love exploring new places',
};

describe('User model', () => {
    describe('fromDb()', () => {
        it('maps all database fields correctly', () => {
            const user = User.fromDb(baseRow);

            expect(user.id).toBe('user-1');
            expect(user.username).toBe('johndoe');
            expect(user.email).toBe('john@example.com');
            expect(user.password).toBe('hashed_password');
            expect(user.location).toBe('Madrid');
            expect(user.avatarUrl).toBe('https://example.com/avatar.jpg');
            expect(user.name).toBe('John Doe');
            expect(user.bio).toBe('Traveller at heart');
            expect(user.about).toBe('I love exploring new places');
        });

        it('generates avatar URL when avatar_url is null', () => {
            const user = User.fromDb({ ...baseRow, avatar_url: null });
            expect(user.avatarUrl).toContain('ui-avatars.com');
            expect(user.avatarUrl).toContain('johndoe');
        });

        it('parses total_itineraries when the query computed it (e.g. findByFilters)', () => {
            const user = User.fromDb({ ...baseRow, total_itineraries: '5' });
            expect(user.countItineraries()).toBe(5);
        });

        it('defaults totalItineraries to 0 when the query did not compute it', () => {
            const user = User.fromDb(baseRow);
            expect(user.countItineraries()).toBe(0);
        });
    });

    describe('constructor defaults', () => {
        it('uses null name when not provided', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.name).toBeNull();
        });

        it('uses null bio when not provided', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.bio).toBeNull();
        });

        it('uses null about when not provided', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.about).toBeNull();
        });

        it('initializes followersListIds as empty array', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.followersListIds).toEqual([]);
        });

        it('initializes followingListIds as empty array', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.followingListIds).toEqual([]);
        });

        it('initializes itineraries as empty array', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.itineraries).toEqual([]);
        });
    });

    describe('countItineraries()', () => {
        it('returns totalItineraries when set', () => {
            const user = new User({ id: '1', username: 'test', totalItineraries: 7 });
            expect(user.countItineraries()).toBe(7);
        });

        it('falls back to itineraries array length', () => {
            const user = new User({ id: '1', username: 'test', itineraries: [1, 2, 3] });
            expect(user.countItineraries()).toBe(3);
        });
    });

    describe('isPremium()', () => {
        it('returns false when premiumUntil is null', () => {
            const user = new User({ id: '1', username: 'test' });
            expect(user.isPremium()).toBe(false);
        });

        it('returns true when premiumUntil is in the future', () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const user = new User({ id: '1', username: 'test', premiumUntil: futureDate });
            expect(user.isPremium()).toBe(true);
        });

        it('returns false when premiumUntil is in the past', () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const user = new User({ id: '1', username: 'test', premiumUntil: pastDate });
            expect(user.isPremium()).toBe(false);
        });
    });

    describe('totalFollowers() / totalFollowing()', () => {
        it('returns the count of followersListIds', () => {
            const user = new User({ id: '1', username: 'test', followersListIds: ['a', 'b', 'c'] });
            expect(user.totalFollowers()).toBe(3);
        });

        it('returns the count of followingListIds', () => {
            const user = new User({ id: '1', username: 'test', followingListIds: ['x', 'y'] });
            expect(user.totalFollowing()).toBe(2);
        });

        it('returns 0 when no followers', () => {
            const user = User.fromDb(baseRow);
            expect(user.totalFollowers()).toBe(0);
        });
    });

    describe('toDTO()', () => {
        it('returns the expected shape', () => {
            const user = User.fromDb(baseRow);
            const dto = user.toDTO();

            expect(dto).toHaveProperty('id', 'user-1');
            expect(dto).toHaveProperty('username', 'johndoe');
            expect(dto).toHaveProperty('email', 'john@example.com');
            expect(dto).toHaveProperty('location', 'Madrid');
            expect(dto).toHaveProperty('avatarUrl');
            expect(dto).toHaveProperty('name', 'John Doe');
            expect(dto).toHaveProperty('bio');
            expect(dto).toHaveProperty('about');
            expect(dto).toHaveProperty('totalItineraries');
            expect(dto).toHaveProperty('followers');
            expect(dto).toHaveProperty('following');
            expect(dto).toHaveProperty('followersListIds');
            expect(dto).toHaveProperty('followingListIds');
            expect(dto).toHaveProperty('premiumUntil');
            expect(dto).toHaveProperty('isPremium', false);
        });

        it('does NOT expose the password', () => {
            const user = User.fromDb(baseRow);
            const dto = user.toDTO();
            expect(dto).not.toHaveProperty('password');
        });

        // Regression: createdAt used to be pre-formatted server-side via
        // formatDate(), which hardcodes the "en-US" locale, so a Spanish-language
        // viewer would see an English month name ("Se unió August 2026"). Leaving
        // it raw lets each client format it with the viewer's own locale.
        it('leaves createdAt as the raw date, not pre-formatted to a locale', () => {
            const user = User.fromDb(baseRow);
            const dto = user.toDTO();
            expect(dto.createdAt).toBe(baseRow.created_at);
        });

        it('defaults isTrialEligible to false when the service never set it', () => {
            const user = User.fromDb(baseRow);
            expect(user.toDTO().isTrialEligible).toBe(false);
        });

        it('exposes isTrialEligible as set by the service', () => {
            const user = User.fromDb(baseRow);
            user.isTrialEligible = true;
            expect(user.toDTO().isTrialEligible).toBe(true);
        });
    });

    describe('toPublicDTO()', () => {
        it('does NOT expose email or the exact premiumUntil date', () => {
            const user = User.fromDb({ ...baseRow, premium_until: new Date(Date.now() + 86400000) });
            const dto = user.toPublicDTO();

            expect(dto).not.toHaveProperty('email');
            expect(dto).not.toHaveProperty('premiumUntil');
            expect(dto).toHaveProperty('isPremium', true);
        });

        it('does NOT expose isTrialEligible, since a viewer should not see someone else\'s trial status', () => {
            const user = User.fromDb(baseRow);
            user.isTrialEligible = true;
            const dto = user.toPublicDTO();

            expect(dto).not.toHaveProperty('isTrialEligible');
        });
    });

    describe('toSimpleDTO()', () => {
        it('returns only id, username, avatarUrl, role, and isPremium', () => {
            const user = User.fromDb(baseRow);
            const dto = user.toSimpleDTO();

            expect(Object.keys(dto)).toEqual(['id', 'username', 'avatarUrl', 'role', 'isPremium']);
        });
    });

    describe('toFeaturedDTO()', () => {
        it('returns id, username, location, totalItineraries, and avatarUrl', () => {
            const user = User.fromDb(baseRow);
            const dto = user.toFeaturedDTO();

            expect(dto).toHaveProperty('id');
            expect(dto).toHaveProperty('username');
            expect(dto).toHaveProperty('location');
            expect(dto).toHaveProperty('totalItineraries');
            expect(dto).toHaveProperty('avatarUrl');
            expect(dto).not.toHaveProperty('email');
            expect(dto).not.toHaveProperty('password');
        });
    });
});
