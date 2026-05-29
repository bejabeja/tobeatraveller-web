import { getApiUrl } from '../utils/apiConfig';
import { authFetch } from '../utils/authFetch';

const base = () => `${getApiUrl()}/notifications`;

export const fetchNotifications = async (page = 1) => {
    const res = await authFetch(`${base()}?page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
};

export const fetchUnreadCount = async () => {
    const res = await authFetch(`${base()}/unread-count`);
    if (!res.ok) throw new Error('Failed to fetch unread count');
    return res.json();
};

export const markNotificationsRead = async () => {
    const res = await authFetch(`${base()}/read`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
};
