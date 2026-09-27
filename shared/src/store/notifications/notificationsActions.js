import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from '../../services/notifications.js';

export const START_LOADING_NOTIFICATIONS = '@notifications/startLoading';
export const SET_NOTIFICATIONS = '@notifications/set';
export const SET_NOTIFICATIONS_ERROR = '@notifications/error';
export const SET_UNREAD_COUNT = '@notifications/setUnreadCount';
export const MARK_ALL_READ = '@notifications/markAllRead';
export const START_LOADING_MORE_NOTIFICATIONS = '@notifications/startLoadingMore';
export const APPEND_NOTIFICATIONS = '@notifications/append';
export const APPEND_NOTIFICATIONS_ERROR = '@notifications/appendError';

// Resolves to how many were unread, or null when the list couldn't load.
export const initNotifications = () => async (dispatch) => {
    dispatch({ type: START_LOADING_NOTIFICATIONS });
    try {
        const [{ notifications, totalPages, currentPage }, { count }] = await Promise.all([
            fetchNotifications(1),
            fetchUnreadCount(),
        ]);
        dispatch({ type: SET_NOTIFICATIONS, payload: { notifications, totalPages, page: currentPage } });
        dispatch({ type: SET_UNREAD_COUNT, payload: count });
        return count;
    } catch {
        dispatch({ type: SET_NOTIFICATIONS_ERROR });
        return null;
    }
};

// Opening the list: loaded first, then marked as seen. The other way round
// it could arrive already read, and none would show as new.
export const openNotifications = () => async (dispatch) => {
    const unreadCount = await dispatch(initNotifications());
    if (unreadCount > 0) await dispatch(markAllNotificationsRead());
};

export const loadMoreNotifications = (nextPage) => async (dispatch) => {
    dispatch({ type: START_LOADING_MORE_NOTIFICATIONS });
    try {
        const { notifications, totalPages, currentPage } = await fetchNotifications(nextPage);
        dispatch({ type: APPEND_NOTIFICATIONS, payload: { notifications, totalPages, page: currentPage } });
    } catch {
        dispatch({ type: APPEND_NOTIFICATIONS_ERROR });
    }
};

export const refreshUnreadCount = () => async (dispatch) => {
    try {
        const { count } = await fetchUnreadCount();
        dispatch({ type: SET_UNREAD_COUNT, payload: count });
    } catch {}
};

export const markAllNotificationsRead = () => async (dispatch) => {
    try {
        await markNotificationsRead();
        dispatch({ type: MARK_ALL_READ });
    } catch {}
};
