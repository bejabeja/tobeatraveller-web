import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = (baseUrl, body) => fetch(`${baseUrl}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

describe('contact rate limits', () => {
    let server;
    let baseUrl;

    // The counters live in the limiter instances, which are module level: reimport per test to start from zero.
    beforeEach(async () => {
        vi.resetModules();
        const { perEmailContactRateLimit, perIpContactRateLimit } = await import('../../middlewares/contactRateLimit.js');
        const { errorHandler } = await import('../../middlewares/errorHandler.js');
        const app = express();
        app.use(express.json());
        app.post('/contact', perIpContactRateLimit, perEmailContactRateLimit, (req, res) => res.status(req.body.fails ? 500 : 200).json({ ok: true }));
        app.use(errorHandler);
        await new Promise((resolve) => { server = app.listen(0, resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(() => new Promise((resolve) => server.close(resolve)));

    it('answers 429 once the same address has been mailed three times, whatever the case', async () => {
        const emails = ['victim@example.com', 'Victim@Example.com', ' victim@example.com ', 'VICTIM@example.com'];
        const statuses = [];
        for (const email of emails) {
            statuses.push((await post(baseUrl, { email })).status);
        }

        expect(statuses).toEqual([200, 200, 200, 429]);
    });

    it('answers 429 to the sixth message from the same IP even with different addresses', async () => {
        const statuses = [];
        for (let i = 0; i < 6; i += 1) {
            statuses.push((await post(baseUrl, { email: `person${i}@example.com` })).status);
        }

        expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    });

    it('does not count requests without an email against any address', async () => {
        for (let i = 0; i < 3; i += 1) await post(baseUrl, {});

        expect((await post(baseUrl, { email: 'ana@example.com' })).status).toBe(200);
    });

    // Regression-in-waiting: a send that fails (the email provider is down) sends nothing,
    // so retrying it must not eat the hour's allowance.
    it('does not count the messages that failed to send', async () => {
        for (let i = 0; i < 6; i += 1) await post(baseUrl, { email: 'ana@example.com', fails: true });

        expect((await post(baseUrl, { email: 'ana@example.com' })).status).toBe(200);
    });
});
