import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { resendVerificationEmail, verifyEmail } from '../../services/auth.js';

describe('email verification services', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Email confirmed' }) });
    });

    describe('verifyEmail', () => {
        it('sends the token from the link, with no session needed', async () => {
            await verifyEmail('t'.repeat(64));

            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toBe('http://api.test/auth/verify-email');
            expect(JSON.parse(options.body)).toEqual({ token: 't'.repeat(64) });
            expect(options.headers.Authorization).toBeUndefined();
        });

        it('throws an error carrying the status when the link does not work, so the page can say so', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Invalid or expired token' }) });

            await expect(verifyEmail('x')).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('resendVerificationEmail', () => {
        it('asks for a new link at the right address', async () => {
            await resendVerificationEmail();

            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toBe('http://api.test/auth/resend-verification');
            expect(options.method).toBe('POST');
        });

        it('throws an error carrying the status when the limit is reached, so the screen can say so', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'Too many confirmation emails' }) });

            await expect(resendVerificationEmail()).rejects.toMatchObject({ status: 429 });
        });
    });
});
