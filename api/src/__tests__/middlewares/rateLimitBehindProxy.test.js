import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// index.js trusts the proxy: on Vercel the address in X-Forwarded-For is the client's own.
const LIMITERS = [
    ['contact', 'contactRateLimit', 'perIpContactRateLimit'],
    ['confirmation email', 'emailVerificationRateLimit', 'perIpResendVerificationRateLimit'],
    ['sign in', 'authRateLimit', 'failedLoginPerIpRateLimit'],
    ['sign up', 'authRateLimit', 'signupPerIpRateLimit'],
    ['AI generation', 'aiGenerationRateLimit', 'globalAiRateLimit'],
];

describe.each(LIMITERS)('the %s rate limit behind the proxy', (_name, file, exportName) => {
    let server;
    let baseUrl;
    let logged;

    beforeEach(async () => {
        vi.resetModules();
        logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        const limiter = (await import(`../../middlewares/${file}.js`))[exportName];
        const { errorHandler } = await import('../../middlewares/errorHandler.js');
        const app = express();
        app.set('trust proxy', true);
        app.post('/x', limiter, (req, res) => res.status(401).json({ ip: req.ip }));
        app.use(errorHandler);
        await new Promise((resolve) => { server = app.listen(0, resolve); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(async () => {
        logged.mockRestore();
        await new Promise((resolve) => server.close(resolve));
    });

    // Regression-in-waiting: it was logged as an error on the first request of every limiter, drowning the real ones.
    it('does not fill the logs with a warning about the proxy setting', async () => {
        await fetch(`${baseUrl}/x`, { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' } });

        expect(logged.mock.calls.flat().join(' ')).not.toContain('ERR_ERL_PERMISSIVE_TRUST_PROXY');
    });

    it('counts each visitor by the address the proxy reports, not all of them as one', async () => {
        const request = (ip) => fetch(`${baseUrl}/x`, { method: 'POST', headers: { 'x-forwarded-for': ip } });

        const first = await (await request('203.0.113.7')).json();
        const second = await (await request('198.51.100.9')).json();

        expect(first.ip).toBe('203.0.113.7');
        expect(second.ip).toBe('198.51.100.9');
    });
});
