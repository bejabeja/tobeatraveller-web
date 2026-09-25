import { MOMENT_KINDS, PASSPORT_SHARE_MOMENT } from './constants/badges.js';

export const MAX_CELEBRATIONS_AT_ONCE = 3;
export const MAX_REMEMBERED_CELEBRATIONS = 100;
export const CELEBRATED_STORAGE_KEY = 'celebrated_notifications';

const toMoment = (notification) => {
    if (notification.type === 'country_stamp' && notification.countryCode) {
        return { kind: MOMENT_KINDS.COUNTRY, code: notification.countryCode };
    }
    if (notification.type === 'badge_earned' && notification.badgeId) {
        return { kind: MOMENT_KINDS.BADGE, code: notification.badgeId };
    }
    return null;
};

const asList = (value) => (Array.isArray(value) ? value : []);

// The new countries and badges to celebrate on screen, from the latest
// notifications (newest first, as the API lists them): unread and not yet
// celebrated on this device. The oldest comes first so the newest is the
// last one left on screen.
export const pickCelebrations = (notifications, celebratedIds) => {
    const celebrated = new Set(asList(celebratedIds));
    return notifications
        .filter(notification => !notification.isRead && !celebrated.has(notification.id))
        .map(notification => ({ notificationId: notification.id, moment: toMoment(notification) }))
        .filter(celebration => celebration.moment)
        .slice(0, MAX_CELEBRATIONS_AT_ONCE)
        .reverse();
};

export const rememberCelebrations = (celebratedIds, newIds) => {
    const remembered = [...new Set([...asList(celebratedIds), ...newIds])];
    return remembered.slice(-MAX_REMEMBERED_CELEBRATIONS);
};

export const isSameMoment = (moment, other) => moment.kind === other.kind && moment.code === other.code;

// The country or badge whose card is being opened from its notification
// (the passport's `share`, `country` and `badge` parameters), or null.
export const momentFromShareRequest = ({ share, country, badge }) => {
    if (share !== PASSPORT_SHARE_MOMENT) return null;
    if (country) return { kind: MOMENT_KINDS.COUNTRY, code: country };
    if (badge) return { kind: MOMENT_KINDS.BADGE, code: badge };
    return null;
};
