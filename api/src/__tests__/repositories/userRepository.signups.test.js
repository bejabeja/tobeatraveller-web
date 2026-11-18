import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import db from '../../db/clientPostgres.js';
import { UserRepository } from '../../repositories/userRepository.js';

const SINCE = new Date('2026-10-19T12:00:00Z');

describe('UserRepository sign-up counts', () => {
    const repo = new UserRepository();

    beforeEach(() => db.query.mockReset());

    it.each(['countSignupsByCountry', 'countSignupsByUserAgent'])('%s leaves out the test accounts and counts the recent ones from the date given', async (method) => {
        db.query.mockResolvedValueOnce({ rows: [] });

        await repo[method](SINCE);

        const [query, params] = db.query.mock.calls[0];
        expect(query).toContain("role != 'test'");
        expect(query).toContain('FILTER (WHERE created_at >= $1)');
        expect(params).toEqual([SINCE]);
    });

    it('turns the counts into numbers', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ signup_country_code: 'CH', total: '3', recent: '1' }] });

        expect(await repo.countSignupsByCountry(SINCE)).toEqual([{ countryCode: 'CH', total: 3, recent: 1 }]);
    });

    it('gives no country and no browser for an account that has none', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ signup_country_code: null, signup_user_agent: null }] });

        expect(await repo.getSignupMetadata('user-1')).toEqual({ countryCode: null, userAgent: null });
    });
});
