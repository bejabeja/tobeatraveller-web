import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { getUserPassport } from '../../services/passport.js';

describe('getUserPassport', () => {
    beforeEach(() => {
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    });

    it('asks for the full passport by default', async () => {
        await getUserPassport('user-1');

        expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/users/user-1/passport');
    });

    it('asks for the public version when it is going to be shared', async () => {
        await getUserPassport('user-1', { publicView: true });

        expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/users/user-1/passport?view=public');
    });
});
