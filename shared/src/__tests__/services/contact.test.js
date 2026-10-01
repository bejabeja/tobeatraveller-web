import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { sendContact } from '../../services/auth.js';

const message = { name: 'Ana', email: 'ana@example.com', reason: 'payment', subject: 'Cobro', message: 'Me cobraron dos veces', language: 'es' };

describe('sendContact', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Message sent' }) });
    });

    it('sends the reason along with the message', async () => {
        await sendContact(message);

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://api.test/contact');
        expect(JSON.parse(options.body)).toEqual(message);
    });

    it('works without a session, with no Authorization header', async () => {
        await expect(sendContact(message)).resolves.toEqual({ message: 'Message sent' });

        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    it('throws an error carrying the status when the limit is reached, so the screen can say so', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'Too many contact messages, please try again later.' }) });

        await expect(sendContact(message)).rejects.toMatchObject({ status: 429 });
    });
});
