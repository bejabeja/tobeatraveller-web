import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { checkUsernameAvailable, deleteMyAccount, exportMyData, getFeaturedUsers, getUserForAuth, updateMyLanguage } from '../../services/users.js';
import { logout, sendContact } from '../../services/auth.js';

describe('updateMyLanguage', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    });

    // Saved on the signed-in user's account: without the token the API
    // would reject it.
    it("saves the signed-in user's language", async () => {
        await updateMyLanguage('es');

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/users/me/language');
        expect(options.method).toBe('PATCH');
        expect(options.headers.Authorization).toBe('Bearer token');
        expect(JSON.parse(options.body)).toEqual({ language: 'es' });
    });
});

describe('sendContact', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    });

    it('sends the language, for the confirmation sent back', async () => {
        await sendContact({ name: 'Ana', email: 'ana@example.com', subject: 'Hola', message: 'Un mensaje', language: 'es' });

        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ language: 'es' });
    });
});

describe('getFeaturedUsers', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    });

    // Regression: sent without the session, so the API couldn't leave out
    // the people the user already follows.
    it('sends the session when signed in', async () => {
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });

        await getFeaturedUsers();

        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
    });

    it('still asks for them when signed out', async () => {
        setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });

        await getFeaturedUsers();

        expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/users/featured');
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });
});

describe('checkUsernameAvailable', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ available: true }) });
    });

    // Regression: without the session, going back to one's own earlier name
    // (still reserved for them) was reported as taken.
    it('sends the session when signed in', async () => {
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });

        await expect(checkUsernameAvailable('jane')).resolves.toBe(true);
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
    });
});

describe('getUserForAuth', () => {
    let storage;

    beforeEach(() => {
        setApiUrl('http://api.test');
        storage = {};
        setTokenStorage({
            getItem: async (key) => storage[key] ?? null,
            setItem: async (key, value) => { storage[key] = value; },
            removeItem: async (key) => { delete storage[key]; },
        });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'u1' }) });
    });

    // Every signed-out visit asked the API and got a 401 back: a request for
    // nothing on each page load, and an error in the console.
    it('answers no session without asking the API when no token is stored', async () => {
        const user = await getUserForAuth();

        expect(user).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns the signed-in user when a token is stored', async () => {
        storage.access_token = 'access-token';

        const user = await getUserForAuth();

        expect(user).toEqual({ id: 'u1' });
        expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/users/me');
    });
});

// Regression: the session alone deleted the account or downloaded all its data, so
// whoever got hold of one could do either. The API now asks for the password too.
describe('the requests that need the password again', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    });

    it('sends the password when deleting the account', async () => {
        await deleteMyAccount('my-password');

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/users/me');
        expect(options.method).toBe('DELETE');
        expect(JSON.parse(options.body)).toEqual({ currentPassword: 'my-password' });
    });

    it('sends the password in the body when downloading the data, never in the address', async () => {
        await exportMyData('my-password');

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/users/me/export');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({ currentPassword: 'my-password' });
    });
});

// Regression: signing out only forgot the tokens on the phone, so a copy of the refresh
// token went on opening the account for the week it lasts.
describe('logout', () => {
    it('sends the refresh token, so the API ends that session', async () => {
        setApiUrl('http://api.test');
        const stored = { access_token: 'access', refresh_token: 'refresh' };
        setTokenStorage({ getItem: async (key) => stored[key] ?? null, setItem: async () => {}, removeItem: async (key) => { delete stored[key]; } });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

        await logout();

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/auth/logout');
        expect(JSON.parse(options.body)).toEqual({ refreshToken: 'refresh' });
        expect(stored.refresh_token).toBeUndefined();
    });
});
