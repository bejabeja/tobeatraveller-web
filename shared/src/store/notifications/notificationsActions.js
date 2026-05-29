import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from '../../services/notifications.js';

export const START_LOADING_NOTIFICATIONS = '@notifications/startLoading';
export const SET_NOTIFICATIONS = '@notifications/set';
export const SET_NOTIFICATIONS_ERROR = '@notifications/error';
export const SET_UNREAD_COUNT = '@notifications/setUnreadCount';
export const MARK_ALL_READ = '@notifications/markAllRead';

export const initNotifications = () => async (dispatch) => {
    dispatch({ type: START_LOADING_NOTIFICATIONS });
    try {
        const [{ notifications, totalPages, currentPage }, { count }] = await Promise.all([
            fetchNotifications(1),
            fetchUnreadCount(),
        ]);
        dispatch({ type: SET_NOTIFICATIONS, payload: { notifications, totalPages, page: currentPage } });
        dispatch({ type: SET_UNREAD_COUNT, payload: count });
    } catch {
        dispatch({ type: SET_NOTIFICATIONS_ERROR });
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
