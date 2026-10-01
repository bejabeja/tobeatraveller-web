import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resend = (baseUrl, userId, { fails = false } = {}) => fetch(`${baseUrl}/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user': userId },
    body: JSON.stringify({ fails }),
});

describe('confirmation email rate limits', () => {
    let server;
    let baseUrl;

    // The counters live in the limiter instances, which are module level: reimport per test to start from zero.
    beforeEach(async () => {
        vi.resetModules();
        const { perIpResendVerificationRateLimit, perUserResendVerificationRateLimit } = await import('../../middlewares/emailVerificationRateLimit.js');
        const { errorHandler } = await import('../../middlewares/errorHandler.js');
        const app = express();
        app.use(express.json());
        app.post(
            '/resend',
            (req, res, next) => { req.user = { id: req.headers['x-user'] }; next(); },
            perIpResendVerificationRateLimit,
            perUserResendVerificationRateLimit,
            (req, res) => res.status(req.body.fails ? 500 : 200).json({ ok: true }),
        );
        app.use(errorHandler);
        await new Promise((resolve) => { server = app.listen(0, resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(() => new Promise((resolve) => server.close(resolve)));

    it('answers 429 to the fourth link asked for by the same account', async () => {
        const statuses = [];
        for (let i = 0; i < 4; i += 1) statuses.push((await resend(baseUrl, 'user-1')).status);

        expect(statuses).toEqual([200, 200, 200, 429]);
    });

    it('does not make another account wait for it', async () => {
        for (let i = 0; i < 3; i += 1) await resend(baseUrl, 'user-1');

        expect((await resend(baseUrl, 'user-2')).status).toBe(200);
    });

    it('answers 429 to the eleventh link from the same network, whoever asks', async () => {
        const statuses = [];
        for (let i = 0; i < 11; i += 1) statuses.push((await resend(baseUrl, `user-${i}`)).status);

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
        expect(statuses[10]).toBe(429);
    });

    // Regression-in-waiting: a send that fails on our side sends nothing, so retrying must not use up the hour.
    it('does not count the sends that failed', async () => {
        for (let i = 0; i < 6; i += 1) await resend(baseUrl, 'user-1', { fails: true });

        expect((await resend(baseUrl, 'user-1')).status).toBe(200);
    });
});
