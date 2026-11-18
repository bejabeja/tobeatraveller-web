import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regression: the web kept both tokens in localStorage, where any script on the page could
// read them and take the session elsewhere. Its session is now in httpOnly cookies.
describe('authFetch with the session in cookies (the web)', () => {
    let authFetch;
    let getUserForAuth;
    let storage;

    beforeEach(async () => {
        vi.resetModules();
        const authFetchModule = await import('../../utils/authFetch.js');
        const { setApiUrl } = await import('../../utils/apiConfig.js');
        const { setTokenStorage } = await import('../../utils/tokenStorage.js');
        ({ getUserForAuth } = await import('../../services/users.js'));
        authFetch = authFetchModule.authFetch;
        setApiUrl('http://api.test');
        storage = { setItem: vi.fn(), getItem: vi.fn(async () => 'should-not-be-read'), removeItem: vi.fn() };
        setTokenStorage(storage);
        authFetchModule.enableCookieSession();
    });

    it('sends the cookies and no token of its own', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

        await authFetch('http://api.test/users/me');

        const [, options] = global.fetch.mock.calls[0];
        expect(options.credentials).toBe('include');
        expect(options.headers.Authorization).toBeUndefined();
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it('renews the session through its cookie on a 401 and sends the request again', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 401 })
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'readable-by-scripts' }) })
            .mockResolvedValueOnce({ ok: true, status: 200 });

        const response = await authFetch('http://api.test/users/me');

        expect(response.status).toBe(200);
        const [refreshUrl, refreshOptions] = global.fetch.mock.calls[1];
        expect(refreshUrl).toBe('http://api.test/auth/refresh');
        expect(refreshOptions.credentials).toBe('include');
        expect(JSON.parse(refreshOptions.body)).toEqual({});
        expect(global.fetch.mock.calls[2][1].credentials).toBe('include');
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('gives back the 401 when the session is over', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 401 })
            .mockResolvedValueOnce({ ok: false, status: 401 });

        const response = await authFetch('http://api.test/users/me');

        expect(response.status).toBe(401);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('asks who is signed in although it holds no token', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'user-1' }) });

        await expect(getUserForAuth()).resolves.toEqual({ id: 'user-1' });
    });
});
