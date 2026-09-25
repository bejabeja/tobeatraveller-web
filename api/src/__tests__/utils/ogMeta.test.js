import { describe, it, expect } from 'vitest';
import { buildDefaultOgMeta, buildItineraryOgMeta, buildPassportOgMeta, buildUserOgMeta } from '../../utils/ogMeta.js';

const APP_URL = 'https://tobeatraveller.mabella.dev';

describe('buildItineraryOgMeta()', () => {
    it('uses the itinerary title and description when present', () => {
        const itinerary = {
            title: 'Two weeks in Japan',
            description: 'Temples, ramen and Mount Fuji.',
            tripTotalDays: 14,
            location: { name: 'Japan' },
            photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/trip.jpg',
        };

        const meta = buildItineraryOgMeta(itinerary, APP_URL);

        expect(meta.title).toBe('Two weeks in Japan');
        expect(meta.description).toBe('Temples, ramen and Mount Fuji.');
        expect(meta.imageUrl).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1200/v1/trip.jpg');
    });

    it('falls back to a generic title when the itinerary has none', () => {
        const itinerary = { title: null, tripTotalDays: 5, location: { name: 'Lisbon' } };

        expect(buildItineraryOgMeta(itinerary, APP_URL).title).toBe('Trip on ToBeATraveller');
    });

    it('builds a description from days and destination when there is none', () => {
        const itinerary = { title: 'Trip', description: null, tripTotalDays: 5, location: { name: 'Lisbon' } };

        expect(buildItineraryOgMeta(itinerary, APP_URL).description).toBe('A 5-day trip to Lisbon');
    });

    it('falls back to "an amazing destination" when there is no location', () => {
        const itinerary = { title: 'Trip', description: null, tripTotalDays: 5, location: null };

        expect(buildItineraryOgMeta(itinerary, APP_URL).description).toBe('A 5-day trip to an amazing destination');
    });

    it('truncates a long description to 160 characters', () => {
        const itinerary = { title: 'Trip', description: 'x'.repeat(200) };

        expect(buildItineraryOgMeta(itinerary, APP_URL).description).toHaveLength(160);
    });

    it('falls back to the site hero image when there is no cover photo', () => {
        const itinerary = { title: 'Trip', photoUrl: null };

        expect(buildItineraryOgMeta(itinerary, APP_URL).imageUrl).toBe(`${APP_URL}/images/hero.jpg`);
    });
});

describe('buildUserOgMeta()', () => {
    it('uses the username as the title, prefixed with @', () => {
        expect(buildUserOgMeta({ username: 'ana' }).title).toBe('@ana');
    });

    it('prefers bio over about for the description', () => {
        const user = { username: 'ana', bio: 'Full-time traveller', about: 'Loves hiking' };

        expect(buildUserOgMeta(user).description).toBe('Full-time traveller');
    });

    it('falls back to about when there is no bio', () => {
        const user = { username: 'ana', bio: null, about: 'Loves hiking' };

        expect(buildUserOgMeta(user).description).toBe('Loves hiking');
    });

    it('falls back to a generic description when there is neither bio nor about', () => {
        const user = { username: 'ana', bio: null, about: null };

        expect(buildUserOgMeta(user).description).toBe("ana's travel itineraries on ToBeATraveller");
    });

    it('optimizes a Cloudinary avatar URL', () => {
        const user = { username: 'ana', avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1/ana.jpg' };

        expect(buildUserOgMeta(user).imageUrl).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1200/v1/ana.jpg');
    });

    it("uses the app's image when the user has no avatar, instead of an empty one", () => {
        expect(buildUserOgMeta({ username: 'ana', avatarUrl: null }, APP_URL).imageUrl).toBe(`${APP_URL}/images/hero.jpg`);
    });

    it('passes through a non-Cloudinary avatar URL unchanged', () => {
        const user = { username: 'ana', avatarUrl: 'https://ui-avatars.com/api/?name=ana' };

        expect(buildUserOgMeta(user).imageUrl).toBe('https://ui-avatars.com/api/?name=ana');
    });
});

describe('buildPassportOgMeta()', () => {
    const passport = (countries) => ({
        owner: { id: 'u1', username: 'jane', avatarUrl: null },
        achievements: [],
        countries: countries.map(code => ({ code, firstVisitedOn: '2026-03-01', isPrivate: false })),
    });

    it('shows whose passport it is and how many countries it has', () => {
        const meta = buildPassportOgMeta(passport(['ES', 'FR', 'IT']), APP_URL);

        expect(meta.title).toBe("@jane's travel passport: 3 countries");
        expect(meta.description).toMatch(/^🇪🇸 🇫🇷 🇮🇹 /);
        expect(meta.imageUrl).toBe(`${APP_URL}/images/hero.jpg`);
    });

    it('uses the singular for one country', () => {
        expect(buildPassportOgMeta(passport(['ES']), APP_URL).title).toBe("@jane's travel passport: 1 country");
    });

    it('does not claim any country when there is none public yet', () => {
        const meta = buildPassportOgMeta(passport([]), APP_URL);

        expect(meta.title).toBe("@jane's travel passport");
        expect(meta.description).not.toMatch(/\p{Regional_Indicator}/u);
    });

    it('keeps the flags short enough for a link preview', () => {
        const codes = ['ES', 'FR', 'IT', 'PT', 'DE', 'NL', 'BE', 'CH', 'AT', 'NO', 'SE', 'FI', 'DK', 'PL'];
        const meta = buildPassportOgMeta(passport(codes), APP_URL);

        expect(meta.description).toContain('+4');
        expect(meta.description.length).toBeLessThanOrEqual(160);
    });
});

describe('buildDefaultOgMeta()', () => {
    // Served when a trip is private or gone: a preview of the app, never the
    // content, and never a redirect a link-preview bot would follow in a loop.
    it('describes the app with its own image', () => {
        const meta = buildDefaultOgMeta(APP_URL);

        expect(meta.title).toBe('ToBeATraveller');
        expect(meta.description.length).toBeGreaterThan(0);
        expect(meta.imageUrl).toBe(`${APP_URL}/images/hero.jpg`);
    });
});
