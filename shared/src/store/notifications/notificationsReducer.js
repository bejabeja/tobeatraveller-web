import {
    APPEND_NOTIFICATIONS,
    APPEND_NOTIFICATIONS_ERROR,
    MARK_ALL_READ,
    SET_NOTIFICATIONS,
    SET_NOTIFICATIONS_ERROR,
    SET_UNREAD_COUNT,
    START_LOADING_MORE_NOTIFICATIONS,
    START_LOADING_NOTIFICATIONS,
} from './notificationsActions.js';

const initialState = {
    data: [],
    loading: false,
    loadingMore: false,
    error: null,
    unreadCount: 0,
    page: 1,
    totalPages: 1,
};

export const notificationsReducer = (state = initialState, action) => {
    switch (action.type) {
        case START_LOADING_NOTIFICATIONS:
            return { ...state, loading: true };
        case SET_NOTIFICATIONS:
            return {
                ...state,
                loading: false,
                error: null,
                data: action.payload.notifications,
                page: action.payload.page,
                totalPages: action.payload.totalPages,
            };
        case SET_NOTIFICATIONS_ERROR:
            return { ...state, loading: false, error: true };
        case START_LOADING_MORE_NOTIFICATIONS:
            return { ...state, loadingMore: true };
        case APPEND_NOTIFICATIONS:
            return {
                ...state,
                loadingMore: false,
                data: [...state.data, ...action.payload.notifications],
                page: action.payload.page,
                totalPages: action.payload.totalPages,
            };
        case APPEND_NOTIFICATIONS_ERROR:
            return { ...state, loadingMore: false };
        case SET_UNREAD_COUNT:
            return { ...state, unreadCount: action.payload };
        // Only the count: the list on screen keeps showing which were new
        // when it was opened, the point of opening it.
        case MARK_ALL_READ:
            return { ...state, unreadCount: 0 };
        default:
            return state;
    }
};
