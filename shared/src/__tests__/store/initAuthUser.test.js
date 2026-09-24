import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { initAuthUser, loginUser, logoutUser } from '../../store/auth/authActions.js';

const USER = { id: 'user-1', username: 'jane', isPremium: true };

let storage;
let dispatched;
const dispatch = (action) => { dispatched.push(action); };
const initAction = () => dispatched.find(action => action.type === '@auth/init');

beforeEach(() => {
    setApiUrl('http://api.test');
    storage = { access_token: 'token', refresh_token: 'refresh' };
    setTokenStorage({
        getItem: async (key) => storage[key] ?? null,
        setItem: async (key, value) => { storage[key] = value; },
        removeItem: async (key) => { delete storage[key]; },
    });
    dispatched = [];
});

// Regression: opening the mobile app with no connection treated the user as
// logged out, so none of the offline screens could be reached.
describe('initAuthUser', () => {
    it('keeps the last known user when the app starts without a connection', async () => {
        storage.auth_user = JSON.stringify(USER);
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        await initAuthUser()(dispatch);

        expect(initAction().payload).toEqual(USER);
    });

    it('logs out when there is no connection and no user was ever cached', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        await initAuthUser()(dispatch);

        expect(initAction().payload).toBeNull();
    });

    it('logs out, and forgets the cached user, when the server says the session is gone', async () => {
        storage.auth_user = JSON.stringify(USER);
        storage.refresh_token = undefined;
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

        await initAuthUser()(dispatch);

        expect(initAction().payload).toBeNull();
        expect(storage.auth_user).toBeUndefined();
    });

    it('refreshes the cached user from the server when online', async () => {
        storage.auth_user = JSON.stringify({ ...USER, isPremium: false });
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => USER });

        await initAuthUser()(dispatch);

        expect(initAction().payload).toEqual(USER);
        expect(JSON.parse(storage.auth_user)).toEqual(USER);
    });
});

describe('session cache lifecycle', () => {
    it('caches the user on login', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200, json: async () => ({ user: USER, accessToken: 'a', refreshToken: 'r' }),
        });

        await loginUser({ email: 'jane@example.com', password: 'secret' })(dispatch);

        expect(JSON.parse(storage.auth_user)).toEqual(USER);
    });

    it('removes the cached user on logout, like the tokens', async () => {
        storage.auth_user = JSON.stringify(USER);
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

        await logoutUser()(dispatch);

        expect(storage.auth_user).toBeUndefined();
        expect(storage.access_token).toBeUndefined();
    });
});
