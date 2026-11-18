import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ cronSecret: 'the-cron-secret' }));
vi.mock('../../config/config.js', () => ({ default: config }));

import { requireCronSecret } from '../../middlewares/requireCronSecret.js';
import { AuthError } from '../../errors/AuthError.js';

const check = (authorization) => {
    const next = vi.fn();
    requireCronSecret({ headers: authorization === undefined ? {} : { authorization } }, {}, next);
    return next.mock.calls[0][0];
};

describe('requireCronSecret', () => {
    beforeEach(() => { config.cronSecret = 'the-cron-secret'; });

    it('lets the scheduled job in with the secret', () => {
        expect(check('Bearer the-cron-secret')).toBeUndefined();
    });

    it.each([
        ['a wrong secret', 'Bearer the-cron-secreT'],
        ['a secret of another length', 'Bearer short'],
        ['no secret', undefined],
    ])('turns away a request with %s', (_case, authorization) => {
        expect(check(authorization)).toBeInstanceOf(AuthError);
    });

    it('turns everyone away while no secret is set up', () => {
        config.cronSecret = undefined;

        expect(check('Bearer ')).toBeInstanceOf(AuthError);
        expect(check('Bearer undefined')).toBeInstanceOf(AuthError);
    });
});
