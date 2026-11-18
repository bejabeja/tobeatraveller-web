import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import db from '../../db/clientPostgres.js';
import { EmailVerificationRepository } from '../../repositories/emailVerificationRepository.js';
import { PasswordResetRepository } from '../../repositories/passwordResetRepository.js';

describe.each([
    ['PasswordResetRepository', PasswordResetRepository, 'password_reset_tokens'],
    ['EmailVerificationRepository', EmailVerificationRepository, 'email_verification_tokens'],
])('%s.deleteExpired()', (_name, Repository, table) => {
    beforeEach(() => {
        db.query.mockReset();
    });

    it('deletes only the links that expired, used or not, and says how many', async () => {
        db.query.mockResolvedValueOnce({ rowCount: 2 });

        expect(await new Repository().deleteExpired()).toBe(2);
        const [query] = db.query.mock.calls[0];
        expect(query).toMatch(new RegExp(`DELETE FROM ${table}\\s+WHERE expires_at < NOW\\(\\)$`));
    });
});
