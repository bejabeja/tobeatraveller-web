import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { authFetch } from '../../utils/authFetch.js';
import { isNetworkError, isTimeoutError } from '../../utils/parseError.js';

// Regression coverage for the "session dies after 1h" bug: the access token
// expires in 1h and nothing ever refreshed it, so every authenticated request
// silently failed with 401 until the user logged out and back in.
describe('authFetch', () => {
    let storage;

    beforeEach(() => {
        setApiUrl('http://api.test');
        storage = { access_token: 'old-access-token', refresh_token: 'a-refresh-token' };
        setTokenStorage({
            getItem: async (key) => storage[key] ?? null,
            setItem: async (key, value) => { storage[key] = value; },
            removeItem: async (key) => { delete storage[key]; },
        });
    });

    it('attaches the stored access token and returns the response as-is on success', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

        const response = await authFetch('http://api.test/itineraries/1');

        expect(response.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer old-access-token');
    });

    it('does not attempt a refresh when there is no stored token (anonymous request)', async () => {
        storage.access_token = null;
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

        const response = await authFetch('http://api.test/itineraries/1');

        expect(response.status).toBe(401);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('refreshes the access token on 401 and retries the request once', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 401 }) // original request
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'new-access-token' }) }) // /auth/refresh
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'itinerary-1' }) }); // retried request

        const response = await authFetch('http://api.test/itineraries/1');

        expect(response.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch.mock.calls[1][0]).toBe('http://api.test/auth/refresh');
        expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access-token');
        expect(storage.access_token).toBe('new-access-token');
    });

    it('returns the original 401 when there is no refresh token stored', async () => {
        storage.refresh_token = null;
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

        const response = await authFetch('http://api.test/itineraries/1');

        expect(response.status).toBe(401);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns the original 401 when the refresh token itself is rejected', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 401 }) // original request
            .mockResolvedValueOnce({ ok: false, status: 401 }); // /auth/refresh rejects the refresh token

        const response = await authFetch('http://api.test/itineraries/1');

        expect(response.status).toBe(401);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('marks a raw fetch rejection (no network) as isNetworkError instead of letting it bubble unmarked', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        await expect(authFetch('http://api.test/itineraries/1')).rejects.toMatchObject({
            isNetworkError: true,
        });
    });

    it('deduplicates concurrent refreshes into a single /auth/refresh call', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 401 }) // request A
            .mockResolvedValueOnce({ ok: false, status: 401 }) // request B
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'new-access-token' }) }) // /auth/refresh
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // retried A
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // retried B

        await Promise.all([
            authFetch('http://api.test/itineraries/1'),
            authFetch('http://api.test/itineraries/2'),
        ]);

        const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === 'http://api.test/auth/refresh');
        expect(refreshCalls).toHaveLength(1);
    });
});

// A request on a weak-but-connected link used to hang until the OS gave up
// (minutes), leaving the mobile form spinning instead of falling back to the
// offline queue.
describe('authFetch timeouts', () => {
    // A fetch that only settles when its signal aborts, like a stalled request.
    const stalledFetch = () => vi.fn((url, { signal }) => new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
    }));

    beforeEach(() => {
        vi.useFakeTimers();
        setApiUrl('http://api.test');
        setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fails as a network timeout once a request passes 15 seconds', async () => {
        global.fetch = stalledFetch();

        const request = authFetch('http://api.test/van-logs');
        const assertion = expect(request).rejects.toMatchObject({ isNetworkError: true, isTimeout: true });
        await vi.advanceTimersByTimeAsync(15_000);

        await assertion;
    });

    it('gives uploads longer than the default before timing out', async () => {
        global.fetch = stalledFetch();
        let settled = false;

        authFetch('http://api.test/life-diary', { method: 'POST', body: new FormData() })
            .catch(() => {})
            .finally(() => { settled = true; });
        await vi.advanceTimersByTimeAsync(15_000);

        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(105_000);
        expect(settled).toBe(true);
    });

    it('uses the timeout the caller asks for', async () => {
        global.fetch = stalledFetch();

        const request = authFetch('http://api.test/users/me/export', { timeoutMs: 60_000 });
        const assertion = expect(request).rejects.toMatchObject({ isTimeout: true });
        await vi.advanceTimersByTimeAsync(60_000);

        await assertion;
    });

    it('leaves cancellation to a caller that passes its own signal', async () => {
        global.fetch = stalledFetch();
        const controller = new AbortController();
        let settled = false;

        authFetch('http://api.test/itineraries/generate-smart', { signal: controller.signal })
            .catch(() => {})
            .finally(() => { settled = true; });
        await vi.advanceTimersByTimeAsync(30_000);

        expect(settled).toBe(false);
        controller.abort();
    });

    it('also stops waiting on a token refresh that stalls', async () => {
        global.fetch = vi.fn((url, options) => url.endsWith('/auth/refresh')
            ? stalledFetch()(url, options)
            : Promise.resolve({ ok: false, status: 401 }));

        const request = authFetch('http://api.test/van-logs');
        await vi.advanceTimersByTimeAsync(15_000);

        await expect(request).resolves.toMatchObject({ status: 401 });
    });

    it('does not send the timeout option to fetch', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

        await authFetch('http://api.test/users/me/export', { timeoutMs: 60_000 });

        expect(global.fetch.mock.calls[0][1]).not.toHaveProperty('timeoutMs');
    });

    it('still reports a plain connection failure as a network error, not a timeout', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        const error = await authFetch('http://api.test/van-logs').catch(caught => caught);

        expect(isNetworkError(error)).toBe(true);
        expect(isTimeoutError(error)).toBe(false);
    });
});
