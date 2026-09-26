import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { updateMyLanguage } from '../../services/users.js';
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
