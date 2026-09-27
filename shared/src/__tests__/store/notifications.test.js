import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setApiUrl } from '../../utils/apiConfig.js';
import { setTokenStorage } from '../../utils/tokenStorage.js';
import { MARK_ALL_READ, openNotifications } from '../../store/notifications/notificationsActions.js';
import { notificationsReducer } from '../../store/notifications/notificationsReducer.js';

const NOTIFICATION = { id: 'n1', isRead: false };
let calls;

// Runs thunks like redux-thunk does, so a thunk dispatching another one waits for it.
const dispatch = (action) => (typeof action === 'function' ? action(dispatch) : action);

const respond = (unreadCount) => {
    global.fetch = vi.fn(async (url, options = {}) => {
        const path = new URL(url).pathname;
        calls.push(`${options.method ?? 'GET'} ${path}`);
        if (path.endsWith('/unread-count')) return { ok: true, json: async () => ({ count: unreadCount }) };
        if (path.endsWith('/read')) return { ok: true, json: async () => ({}) };
        return { ok: true, json: async () => ({ notifications: [NOTIFICATION], totalPages: 1, currentPage: 1 }) };
    });
};

beforeEach(() => {
    setApiUrl('http://api.test');
    setTokenStorage({ getItem: async () => 'token', setItem: async () => {}, removeItem: async () => {} });
    calls = [];
});

describe('openNotifications', () => {
    // Regression: marking as read could finish before the list loaded, and
    // then none showed as new.
    it('loads the list before marking it as seen', async () => {
        respond(1);

        await dispatch(openNotifications());

        const markedAt = calls.indexOf('PATCH /notifications/read');
        expect(markedAt).toBeGreaterThan(calls.indexOf('GET /notifications'));
    });

    it('marks nothing when nothing was unread', async () => {
        respond(0);

        await dispatch(openNotifications());

        expect(calls).not.toContain('PATCH /notifications/read');
    });
});

describe('notificationsReducer on marking all as read', () => {
    // Regression: the list on screen turned read at once, so opening it
    // never showed which were new.
    it('clears the count but keeps showing which were new', () => {
        const state = notificationsReducer({ data: [NOTIFICATION], unreadCount: 1 }, { type: MARK_ALL_READ });

        expect(state.unreadCount).toBe(0);
        expect(state.data[0].isRead).toBe(false);
    });
});
