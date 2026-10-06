import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { CELEBRATION_CHECK_DELAY_MS, refreshUnreadCountSoon } from '../../store/notifications/notificationsActions.js';

beforeEach(() => {
    vi.useFakeTimers();
    setApiUrl('http://api.test');
    setTokenStorage({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} });
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ count: 1 }) }));
});

afterEach(() => vi.useRealTimers());

describe('refreshUnreadCountSoon', () => {
    // Regression: stamps earned by saving an expense were only celebrated on the next page change or poll.
    it('checks for new notifications shortly after, not right away', async () => {
        const dispatch = vi.fn();

        refreshUnreadCountSoon()(dispatch);

        expect(dispatch).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(CELEBRATION_CHECK_DELAY_MS);
        expect(dispatch).toHaveBeenCalledTimes(1);
    });
});
