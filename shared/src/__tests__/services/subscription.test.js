import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { createCheckoutSession } from '../../services/subscription.js';

describe('createCheckoutSession', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) });
    });

    const sentBody = () => JSON.parse(global.fetch.mock.calls[0][1].body);

    it('asks for the free trial unless told otherwise', async () => {
        await createCheckoutSession('annual');

        expect(sentBody()).toEqual({ plan: 'annual', startTrial: true });
    });

    it('asks to subscribe right away, without the trial, when the traveller chooses to', async () => {
        await createCheckoutSession('annual', { startTrial: false });

        expect(sentBody()).toEqual({ plan: 'annual', startTrial: false });
    });
});
