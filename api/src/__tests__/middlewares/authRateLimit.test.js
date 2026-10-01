import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = (baseUrl, path, body) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

describe('auth rate limits', () => {
    let server;
    let baseUrl;
    let limits;

    // The counters live in the limiter instances, which are module level: reimport per test to start from zero.
    beforeEach(async () => {
        vi.resetModules();
        limits = await import('../../middlewares/authRateLimit.js');
        const { errorHandler } = await import('../../middlewares/errorHandler.js');
        const app = express();
        app.use(express.json());
        // Like the real ones: a wrong password answers 401, a right one 200.
        app.post('/login', limits.failedLoginPerIpRateLimit, limits.failedLoginPerAccountRateLimit,
            (req, res) => res.status(req.body.password === 'right-password' ? 200 : 401).json({}));
        app.post('/forgot-password', limits.passwordResetPerIpRateLimit, limits.passwordResetPerAccountRateLimit,
            (req, res) => res.status(200).json({}));
        app.post('/create', limits.signupPerIpRateLimit,
            (req, res) => res.status(req.body.taken ? 409 : 201).json({}));
        app.use(errorHandler);
        await new Promise((resolve) => { server = app.listen(0, resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(() => new Promise((resolve) => server.close(resolve)));

    const statusesOf = async (count, request) => {
        const statuses = [];
        for (let i = 0; i < count; i += 1) statuses.push((await request(i)).status);
        return statuses;
    };

    describe('signing in', () => {
        const wrong = (email) => send(baseUrl, '/login', { email, password: 'wrong' });
        const right = (email) => send(baseUrl, '/login', { email, password: 'right-password' });

        it('stops guessing the password of one account after 10 failures, whatever the case of the email', async () => {
            const emails = Array.from({ length: 11 }, (_, i) => (i % 2 ? 'ANA@example.com' : ' ana@example.com'));

            const statuses = await statusesOf(11, (i) => wrong(emails[i]));

            expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
            expect(statuses[10]).toBe(429);
        });

        // Regression-in-waiting: using the app every day must never run the allowance down.
        it('never counts the sign-ins that work', async () => {
            const statuses = await statusesOf(25, () => right('ana@example.com'));

            expect(statuses).toEqual(Array(25).fill(200));
        });

        it('keeps the failed attempts on one account from locking another', async () => {
            await statusesOf(10, () => wrong('ana@example.com'));

            expect((await right('bob@example.com')).status).toBe(200);
        });

        it('stops one network trying many accounts after 30 failures', async () => {
            const statuses = await statusesOf(31, (i) => wrong(`person${i}@example.com`));

            expect(statuses.slice(0, 30)).toEqual(Array(30).fill(401));
            expect(statuses[30]).toBe(429);
        });

        it('answers with the message the apps translate', async () => {
            await statusesOf(10, () => wrong('ana@example.com'));

            const response = await wrong('ana@example.com');

            expect(await response.json()).toEqual({ error: limits.TOO_MANY_AUTH_ATTEMPTS_MESSAGE });
        });

        it('answers the same for an email that has no account, so it reveals nothing about who has one', async () => {
            const known = await statusesOf(11, () => wrong('ana@example.com'));
            const unknown = await statusesOf(11, () => wrong('nobody-has-this@example.com'));

            expect(unknown).toEqual(known);
        });
    });

    describe('asking for a password reset', () => {
        const ask = (email) => send(baseUrl, '/forgot-password', { email });

        it('sends no more than 3 to the same address in an hour', async () => {
            const statuses = await statusesOf(4, () => ask('victim@example.com'));

            expect(statuses).toEqual([200, 200, 200, 429]);
        });

        it('sends no more than 10 from the same network, to whoever', async () => {
            const statuses = await statusesOf(11, (i) => ask(`person${i}@example.com`));

            expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
            expect(statuses[10]).toBe(429);
        });
    });

    describe('creating an account', () => {
        it('allows 10 an hour from the same network, and then stops', async () => {
            const statuses = await statusesOf(11, (i) => send(baseUrl, '/create', { email: `p${i}@example.com` }));

            expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201));
            expect(statuses[10]).toBe(429);
        });

        it('does not count the signups that were refused, such as a name already taken', async () => {
            await statusesOf(15, () => send(baseUrl, '/create', { taken: true }));

            expect((await send(baseUrl, '/create', {})).status).toBe(201);
        });
    });
});
