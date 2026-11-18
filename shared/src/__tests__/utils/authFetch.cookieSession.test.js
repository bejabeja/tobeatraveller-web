import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regression: the web kept both tokens in localStorage, where any script on the page could
// read them and take the session elsewhere. Its session is now in httpOnly cookies.
describe('authFetch with the session in cookies (the web)', () => {
    let authFetch;
    let getUserForAuth;
    let login;
    let logout;
    let changePassword;
    let initAuthUser;
    let storage;

    beforeEach(async () => {
        vi.resetModules();
        const authFetchModule = await import('../../utils/authFetch.js');
        const { setApiUrl } = await import('../../utils/apiConfig.js');
        const { setTokenStorage } = await import('../../utils/tokenStorage.js');
        ({ getUserForAuth, changePassword } = await import('../../services/users.js'));
        ({ login, logout } = await import('../../services/auth.js'));
        ({ initAuthUser } = await import('../../store/auth/authActions.js'));
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

    // The app's web build used the phone's way: the tokens in localStorage, for any script to take.
    it('signs in with the cookies and keeps no token in the storage', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200, json: async () => ({ user: { id: 'user-1' }, accessToken: 'access', refreshToken: 'refresh' }),
        });

        await expect(login({ email: 'jane@example.com', password: 'secret' })).resolves.toEqual({ id: 'user-1' });

        expect(global.fetch.mock.calls[0][1].credentials).toBe('include');
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('keeps no token in the storage after changing the password', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ accessToken: 'access', refreshToken: 'refresh' }) });

        await changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });

        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not ask the API who is signed in when nobody was signed in last in this browser', async () => {
        storage.getItem = vi.fn(async () => null);
        global.fetch = vi.fn();
        const dispatched = [];

        await initAuthUser()((action) => dispatched.push(action));

        expect(global.fetch).not.toHaveBeenCalled();
        expect(dispatched[0]).toEqual({ type: '@auth/init', payload: null });
    });

    it('signs out with the cookies, so the API ends the session it has in them', async () => {
        storage.getItem = vi.fn(async () => null);
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

        await logout();

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/auth/logout');
        expect(options.credentials).toBe('include');
    });
});
