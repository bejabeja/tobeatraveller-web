import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { checkUsernameAvailable, getFeaturedUsers, getUserForAuth, updateMyLanguage } from '../../services/users.js';
import { sendContact } from '../../services/auth.js';

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
