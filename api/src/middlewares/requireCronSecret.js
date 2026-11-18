import crypto from 'crypto';
import { AuthError } from '../errors/AuthError.js';
import config from '../config/config.js';

// Compared by their hashes, which are always the same length: timingSafeEqual needs that,
// and comparing the secrets as strings would stop at the first different character, so how
// long the answer took would tell how much of a guess was right.
const sameSecret = (given, expected) => crypto.timingSafeEqual(
    crypto.createHash('sha256').update(given).digest(),
    crypto.createHash('sha256').update(expected).digest(),
);

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically once
// CRON_SECRET is set as an env var; this rejects any request that doesn't
// match it, so the scheduled purge endpoint can't be triggered by anyone else.
export const requireCronSecret = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!config.cronSecret || typeof token !== 'string' || !sameSecret(token, config.cronSecret)) {
        return next(new AuthError('Unauthorized'));
    }

    next();
};
