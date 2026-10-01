import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { changePassword } from '../../services/users.js';

describe('changePassword', () => {
    let stored;

    beforeEach(() => {
        setApiUrl('http://api.test');
        stored = { access_token: 'old-access', refresh_token: 'old-refresh' };
        setTokenStorage({
            getItem: async (key) => stored[key] ?? null,
            setItem: async (key, value) => { stored[key] = value; },
            removeItem: async (key) => { delete stored[key]; },
        });
    });

    const respondWith = (response) => { global.fetch = vi.fn().mockResolvedValue(response); };

    // Regression: the new password closes every session, this device's too, so keeping the old tokens signed out whoever changed it.
    it('keeps the session this device is given instead of the one the new password just ended', async () => {
        respondWith({ ok: true, json: async () => ({ message: 'Password updated successfully', accessToken: 'new-access', refreshToken: 'new-refresh' }) });

        await changePassword({ currentPassword: 'old-password', newPassword: 'brand-new-password' });

        expect(stored).toEqual({ access_token: 'new-access', refresh_token: 'new-refresh' });
    });

    it('sends both passwords to the right place', async () => {
        respondWith({ ok: true, json: async () => ({ message: 'ok' }) });

        await changePassword({ currentPassword: 'old-password', newPassword: 'brand-new-password' });

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/users/me/password');
        expect(options.method).toBe('PATCH');
        expect(JSON.parse(options.body)).toEqual({ currentPassword: 'old-password', newPassword: 'brand-new-password' });
    });

    it('leaves the tokens alone when an older API answers without them', async () => {
        respondWith({ ok: true, json: async () => ({ message: 'Password updated successfully' }) });

        await changePassword({ currentPassword: 'old-password', newPassword: 'brand-new-password' });

        expect(stored).toEqual({ access_token: 'old-access', refresh_token: 'old-refresh' });
    });

    it('keeps the tokens, and throws, when the password was not changed', async () => {
        respondWith({ ok: false, status: 401, json: async () => ({ error: 'Current password is incorrect' }) });

        await expect(changePassword({ currentPassword: 'wrong', newPassword: 'brand-new-password' })).rejects.toMatchObject({ status: 401 });
        expect(stored).toEqual({ access_token: 'old-access', refresh_token: 'old-refresh' });
    });
});
