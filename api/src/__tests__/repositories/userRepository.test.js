import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import db from '../../db/clientPostgres.js';
import { UserRepository } from '../../repositories/userRepository.js';

// Regression coverage: emails used to be compared case-sensitively, so a user who
// registered as "Jane@Example.com" couldn't log in or reset their password by typing
// "jane@example.com" (the natural way to type it back).
describe('UserRepository email case-insensitivity', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('findByEmail compares case-insensitively and trims whitespace', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await repo.findByEmail('  Jane@Example.com  ');

        expect(db.query.mock.calls[0][0]).toMatch(/LOWER\(email\) = LOWER\(\$1\)/);
        expect(db.query.mock.calls[0][1]).toEqual(['Jane@Example.com']);
    });

    it('save() stores the email lowercased and trimmed', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 'u1', email: 'jane@example.com' }] });

        await repo.save({
            uuid: 'u1', username: 'jane', email: '  Jane@Example.com  ',
            password: 'hashed', location: null, avatarUrl: null, termsAcceptedAt: null,
        });

        const params = db.query.mock.calls[0][1];
        expect(params[2]).toBe('jane@example.com');
    });

    it('save() persists the signup country and user agent', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 'u1' }] });

        await repo.save({
            uuid: 'u1', username: 'jane', email: 'jane@example.com', password: 'hashed',
            location: null, avatarUrl: null, termsAcceptedAt: null,
            signupCountryCode: 'US', signupUserAgent: 'Mozilla/5.0 (test)',
        });

        const [query, params] = db.query.mock.calls[0];
        expect(query).toMatch(/signup_country_code/);
        expect(query).toMatch(/signup_user_agent/);
        expect(params).toContain('US');
        expect(params).toContain('Mozilla/5.0 (test)');
    });
});

// Regression coverage: usernames used to be compared case-sensitively, so "Sandra" and
// "sandra" were treated as different usernames and both could be registered, even though
// they're indistinguishable to other users (e.g. in @mentions or profile URLs).
describe('UserRepository.findByName username case-insensitivity', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('compares usernames case-insensitively', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await repo.findByName('Sandra');

        expect(db.query.mock.calls[0][0]).toMatch(/LOWER\(username\) = LOWER\(\$1\)/);
        expect(db.query.mock.calls[0][1]).toEqual(['Sandra']);
    });
});

// Regression coverage: findSuggested used to return users the caller already follows,
// so the onboarding "people to follow" screen showed them as not-followed and clicking
// "Follow" on them failed with a 409 ConflictError from FollowService.
describe('UserRepository.findSuggested excludes already-followed users', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('filters out users already followed by the requester', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await repo.findSuggested('current-user-id');

        const query = db.query.mock.calls[0][0];
        expect(query).toMatch(/NOT EXISTS/);
        expect(query).toMatch(/FROM user_followers/);
        expect(query).toMatch(/follower_id = \$1 AND followed_id = users\.id/);
        expect(db.query.mock.calls[0][1]).toEqual(['current-user-id']);
    });
});

describe('UserRepository.findAllForSitemap()', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('excludes test users and users with no public itinerary, mapping rows to plain {id, updatedAt} entries', async () => {
        db.query.mockResolvedValue({
            rows: [{ id: 'user-1', updated_at: '2026-01-01T00:00:00.000Z' }],
        });

        const entries = await repo.findAllForSitemap();

        const query = db.query.mock.calls[0][0];
        expect(query).toMatch(/role != 'test'/);
        expect(query).toMatch(/EXISTS/);
        expect(query).toMatch(/itineraries\.is_public = true/);
        expect(entries).toEqual([{ id: 'user-1', updatedAt: '2026-01-01T00:00:00.000Z' }]);
    });
});

describe('UserRepository.updateRole()', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('updates the role and returns the updated user', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 'user-1', username: 'jane', role: 'admin' }] });

        const user = await repo.updateRole('user-1', 'admin');

        expect(db.query.mock.calls[0][1]).toEqual(['admin', 'user-1']);
        expect(user.role).toBe('admin');
    });

    it('returns null when the user does not exist', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const user = await repo.updateRole('missing', 'admin');

        expect(user).toBeNull();
    });
});

describe('UserRepository.updatePremiumUntil()', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('updates premium_until and returns the updated user', async () => {
        const premiumUntil = new Date('2030-01-01');
        db.query.mockResolvedValue({ rows: [{ id: 'user-1', username: 'jane', premium_until: premiumUntil }] });

        const user = await repo.updatePremiumUntil('user-1', premiumUntil);

        expect(db.query.mock.calls[0][1]).toEqual([premiumUntil, 'user-1']);
        expect(user.premiumUntil).toEqual(premiumUntil);
    });

    it('accepts null to revoke premium access', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 'user-1', username: 'jane', premium_until: null }] });

        await repo.updatePremiumUntil('user-1', null);

        expect(db.query.mock.calls[0][1]).toEqual([null, 'user-1']);
    });

    it('returns null when the user does not exist', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const user = await repo.updatePremiumUntil('missing', new Date());

        expect(user).toBeNull();
    });
});

describe('UserRepository.findByRole()', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('queries users filtered by the given role', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 'admin-1', username: 'root', role: 'superadmin' }] });

        const users = await repo.findByRole('superadmin');

        expect(db.query.mock.calls[0][0]).toMatch(/WHERE role = \$1/);
        expect(db.query.mock.calls[0][1]).toEqual(['superadmin']);
        expect(users).toHaveLength(1);
        expect(users[0].role).toBe('superadmin');
    });
});

describe('UserRepository.findByFilters() sort options', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('orders by created_at DESC for the "newest" sort', async () => {
        db.query.mockImplementation((query) =>
            query.includes('ORDER BY') ? { rows: [] } : { rows: [{ count: '0' }] }
        );

        await repo.findByFilters({ searchName: '', sortBy: 'newest' });

        const listQuery = db.query.mock.calls.find(([q]) => q.includes('ORDER BY'))[0];
        expect(listQuery).toMatch(/ORDER BY created_at DESC/);
    });

    // Regression: the admin users list used to fire one extra query per row
    // to count each user's itineraries; it's now computed in this one query.
    it('computes each user\'s itinerary count in the same query, as total_itineraries', async () => {
        db.query.mockImplementation((query) =>
            query.includes('ORDER BY') ? { rows: [] } : { rows: [{ count: '0' }] }
        );

        await repo.findByFilters({ searchName: '' });

        const listQuery = db.query.mock.calls.find(([q]) => q.includes('ORDER BY'))[0];
        expect(listQuery).toMatch(/AS total_itineraries/);
    });
});

describe('UserRepository.getFeaturedUsers()', () => {
    const repo = new UserRepository();

    beforeEach(() => {
        db.query.mockReset();
        db.query.mockResolvedValue({ rows: [] });
    });

    // Regression: "People you may like" offered people the viewer already
    // followed, and the viewer themselves.
    it('leaves out the viewer and who they follow when signed in', async () => {
        await repo.getFeaturedUsers('viewer-1');

        const [query, params] = db.query.mock.calls[0];
        expect(query).toMatch(/users\.id != \$1/);
        expect(query).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM user_followers\s*WHERE follower_id = \$1 AND followed_id = users\.id/);
        expect(params[0]).toBe('viewer-1');
    });

    it('asks for no viewer when signed out', async () => {
        await repo.getFeaturedUsers();

        expect(db.query.mock.calls[0][1][0]).toBeNull();
    });
});
