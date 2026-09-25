import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { NotificationsRepository } from '../../repositories/notificationsRepository.js';

// Regression coverage for grouping: every like/comment/follow used to insert its own
// row, so a popular itinerary flooded the list with one row per like instead of
// "Jane and 4 others liked your trip".
describe('NotificationsRepository.create()', () => {
    const repo = new NotificationsRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('folds into an existing recent notification of the same type/itinerary instead of inserting a new row', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-1' }] });

        await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        expect(client.query).toHaveBeenCalledTimes(1);
        expect(client.query.mock.calls[0][0]).toMatch(/UPDATE notifications/);
    });

    it('inserts a new row when there is nothing recent to fold into', async () => {
        client.query
            .mockResolvedValueOnce({ rowCount: 0, rows: [] })
            .mockResolvedValueOnce({ rowCount: 1 });

        await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        expect(client.query).toHaveBeenCalledTimes(2);
        expect(client.query.mock.calls[1][0]).toMatch(/INSERT INTO notifications/);
    });

    // Regression: count used to be `count + 1` only when the new actor differed from the
    // *previous* actor_id, so A, B, A within the window counted 3 distinct actors instead
    // of 2. The fold query must track the full set of actors, not just the last one.
    it('tracks distinct actors via an accumulating array, not just the previous actor', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-1' }] });

        await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        const foldQuery = client.query.mock.calls[0][0];
        expect(foldQuery).toMatch(/array_append\(actor_ids/);
        expect(foldQuery).toMatch(/=\s*ANY\(actor_ids\)/);
        // the window check must stay tied to created_at (first event), and created_at
        // must never be reassigned on fold, or the window slides forward indefinitely
        expect(foldQuery).toMatch(/created_at > NOW\(\)/);
        expect(foldQuery).not.toMatch(/created_at\s*=\s*NOW\(\)/);
    });

    // Two badges earned the same day are two pieces of news, not "X and 1 other".
    it('only folds a badge notification into one for the same badge', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }).mockResolvedValueOnce({ rowCount: 1 });

        await repo.create({ userId: 'u1', actorId: 'u1', type: 'badge_earned', badgeId: 'explorer' });

        const [foldQuery, foldParams] = client.query.mock.calls[0];
        expect(foldQuery).toMatch(/badge_id IS NOT DISTINCT FROM \$6/);
        expect(foldParams[5]).toBe('explorer');
        expect(client.query.mock.calls[1][1]).toContain('explorer');
    });

    // Two new countries the same day are two stamps, not "Italy and 1 other".
    it('only folds a country notification into one for the same country', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }).mockResolvedValueOnce({ rowCount: 1 });

        await repo.create({ userId: 'u1', actorId: 'u1', type: 'country_stamp', countryCode: 'IT' });

        const [foldQuery, foldParams] = client.query.mock.calls[0];
        expect(foldQuery).toMatch(/country_code IS NOT DISTINCT FROM \$7/);
        expect(foldParams[6]).toBe('IT');
        expect(client.query.mock.calls[1][1]).toContain('IT');
    });

    it('reports that the event folded into an existing notification', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-1' }] });

        const result = await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        expect(result).toEqual({ grouped: true });
    });

    it('reports that the event opened a new notification', async () => {
        client.query
            .mockResolvedValueOnce({ rowCount: 0, rows: [] })
            .mockResolvedValueOnce({ rowCount: 1 });

        const result = await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        expect(result).toEqual({ grouped: false });
    });

    it('returns null instead of throwing when the query fails', async () => {
        client.query.mockRejectedValueOnce(new Error('connection lost'));

        const result = await repo.create({ userId: 'u1', actorId: 'actor-2', type: 'like', itineraryId: 'itin-1' });

        expect(result).toBeNull();
    });
});

describe('NotificationsRepository.getByUserId()', () => {
    const repo = new NotificationsRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('derives count from the number of distinct actors, not a stored counter', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{
                id: 'n1', type: 'like', is_read: false,
                last_activity_at: new Date(), actor_ids: ['a1', 'a2', 'a3'],
                actor_id: 'a3', actor_username: 'jane', actor_avatar_url: null,
                itinerary_id: 'itin-1', itinerary_title: 'Trip',
            }],
        });

        const [notification] = await repo.getByUserId('u1');

        expect(notification.count).toBe(3);
    });

    it('falls back to a count of 1 when actor_ids is empty or missing', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{
                id: 'n1', type: 'follow', is_read: false,
                last_activity_at: new Date(), actor_ids: null,
                actor_id: 'a1', actor_username: 'jane', actor_avatar_url: null,
                itinerary_id: null, itinerary_title: null,
            }],
        });

        const [notification] = await repo.getByUserId('u1');

        expect(notification.count).toBe(1);
    });

    it('exposes commentId so the client can deep-link to the specific comment', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{
                id: 'n1', type: 'comment', is_read: false,
                last_activity_at: new Date(), actor_ids: ['a1'], comment_id: 'c1',
                actor_id: 'a1', actor_username: 'jane', actor_avatar_url: null,
                itinerary_id: 'itin-1', itinerary_title: 'Trip',
            }],
        });

        const [notification] = await repo.getByUserId('u1');

        expect(notification.commentId).toBe('c1');
    });
});

describe('NotificationsRepository.getPreferences()', () => {
    const repo = new NotificationsRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('returns all preferences enabled by default when the user has no stored row', async () => {
        client.query.mockResolvedValueOnce({ rows: [] });

        const preferences = await repo.getPreferences('u1');

        expect(preferences).toEqual({ notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: true, pushEnabled: true });
    });

    it('maps the stored row to camelCase', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{ notify_on_comment: false, notify_on_like: true, notify_on_follow: false, notify_on_friend_stamps: false, push_enabled: false }],
        });

        const preferences = await repo.getPreferences('u1');

        expect(preferences).toEqual({ notifyOnComment: false, notifyOnLike: true, notifyOnFollow: false, notifyOnFriendStamps: false, pushEnabled: false });
    });
});

describe('NotificationsRepository.upsertPreferences()', () => {
    const repo = new NotificationsRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('upserts only the provided preferences, leaving the others untouched via COALESCE', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{ notify_on_comment: false, notify_on_like: true, notify_on_follow: true, push_enabled: true }],
        });

        await repo.upsertPreferences('u1', { notifyOnComment: false });

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/ON CONFLICT \(user_id\) DO UPDATE/);
        expect(params).toEqual(['u1', false, null, null, null, null]);
    });

    it('returns the resulting preferences mapped to camelCase', async () => {
        client.query.mockResolvedValueOnce({
            rows: [{ notify_on_comment: true, notify_on_like: false, notify_on_follow: true, notify_on_friend_stamps: true, push_enabled: false }],
        });

        const preferences = await repo.upsertPreferences('u1', { notifyOnLike: false });

        expect(preferences).toEqual({ notifyOnComment: true, notifyOnLike: false, notifyOnFollow: true, notifyOnFriendStamps: true, pushEnabled: false });
    });
});

describe('NotificationsRepository.findFollowerIds()', () => {
    const repo = new NotificationsRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it("lists who follows the user, to tell them about the user's new stamps", async () => {
        client.query.mockResolvedValueOnce({ rows: [{ follower_id: 'f1' }, { follower_id: 'f2' }] });

        expect(await repo.findFollowerIds('ana')).toEqual(['f1', 'f2']);
        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/FROM user_followers\s+WHERE followed_id = \$1/);
        expect(params).toEqual(['ana']);
    });
});
