import {
    MARK_ALL_READ,
    SET_NOTIFICATIONS,
    SET_NOTIFICATIONS_ERROR,
    SET_UNREAD_COUNT,
    START_LOADING_NOTIFICATIONS,
} from './notificationsActions.js';

const initialState = {
    data: [],
    loading: false,
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
        case SET_UNREAD_COUNT:
            return { ...state, unreadCount: action.payload };
        case MARK_ALL_READ:
            return {
                ...state,
                unreadCount: 0,
                data: state.data.map(n => ({ ...n, isRead: true })),
            };
        default:
            return state;
    }
};
