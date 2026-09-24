import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import client from '../../db/clientPostgres.js';
import { PushTokensRepository } from '../../repositories/pushTokensRepository.js';

describe('PushTokensRepository', () => {
    const repo = new PushTokensRepository();

    beforeEach(() => {
        client.query.mockReset();
        client.query.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('moves an already known device token to the account that registers it now', async () => {
        await repo.upsert({ userId: 'u2', token: 'ExponentPushToken[a]', platform: 'ios', locale: 'es' });

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/ON CONFLICT \(token\) DO UPDATE/);
        expect(query).toMatch(/user_id = EXCLUDED\.user_id/);
        expect(query).toMatch(/last_seen_at = NOW\(\)/);
        expect(params).toEqual(['mock-uuid', 'u2', 'ExponentPushToken[a]', 'ios', 'es']);
    });

    it('only unregisters the token when it belongs to the requesting user', async () => {
        await repo.deleteForUser('u1', 'ExponentPushToken[a]');

        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/WHERE user_id = \$1 AND token = \$2/);
        expect(params).toEqual(['u1', 'ExponentPushToken[a]']);
    });

    it('skips the query when there are no tokens to delete', async () => {
        await repo.deleteTokens([]);

        expect(client.query).not.toHaveBeenCalled();
    });

    it('returns how many stale tokens were purged', async () => {
        client.query.mockResolvedValueOnce({ rowCount: 4 });

        const deletedCount = await repo.deleteNotSeenSince(90);

        expect(client.query.mock.calls[0][1]).toEqual([90]);
        expect(deletedCount).toBe(4);
    });

    it('maps stored devices to camelCase', async () => {
        const createdAt = new Date('2026-09-01');
        client.query.mockResolvedValueOnce({
            rows: [{ token: 'ExponentPushToken[a]', platform: 'android', locale: 'en', created_at: createdAt, last_seen_at: createdAt }],
        });

        const devices = await repo.findByUserId('u1');

        expect(devices).toEqual([
            { token: 'ExponentPushToken[a]', platform: 'android', locale: 'en', createdAt, lastSeenAt: createdAt },
        ]);
    });
});
