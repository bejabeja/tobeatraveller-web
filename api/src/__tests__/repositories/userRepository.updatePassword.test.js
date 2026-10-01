import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

import db from '../../db/clientPostgres.js';
import { UserRepository } from '../../repositories/userRepository.js';

describe('UserRepository.updatePassword()', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sets the password and ends the open sessions in one statement, so neither can happen without the other', async () => {
        await new UserRepository().updatePassword('user-1', 'hashed', new Date('2026-10-01T10:00:00.000Z'));

        expect(db.query).toHaveBeenCalledTimes(1);
        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toMatch(/password = \$1/);
        expect(sql).toMatch(/sessions_valid_from = \$2/);
        expect(params[0]).toBe('hashed');
        expect(params[2]).toBe('user-1');
    });

    // Regression-in-waiting: a token's `iat` is in whole seconds, so a session opened right after must not look older.
    it('takes the moment in whole seconds, like the iat of a token', async () => {
        await new UserRepository().updatePassword('user-1', 'hashed', new Date('2026-10-01T10:00:00.987Z'));

        expect(db.query.mock.calls[0][1][1]).toEqual(new Date('2026-10-01T10:00:00.000Z'));
    });

    it('uses the clock of the server, not the one of the database', async () => {
        await new UserRepository().updatePassword('user-1', 'hashed');

        expect(db.query.mock.calls[0][0]).not.toMatch(/sessions_valid_from\s*=\s*NOW/i);
        expect(db.query.mock.calls[0][1][1]).toBeInstanceOf(Date);
    });
});
