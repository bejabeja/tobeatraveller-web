import { logger } from '../utils/logger.js';

const NOTIFICATION_TYPE_PREFERENCE_KEY = {
    comment: 'notifyOnComment',
    like: 'notifyOnLike',
    follow: 'notifyOnFollow',
};

// Types whose notifications fold into one row per 24h window still push on
// every event when each event matters on its own (every comment is new
// content); for the rest only the first event of the window pushes, so a
// popular trip doesn't buzz its owner's phone once per like.
const PUSH_ON_EVERY_EVENT_TYPES = new Set(['comment']);

// Notifications about the user's own progress, where the recipient is also
// the "actor", instead of someone else acting on their content.
const SELF_NOTIFICATION_TYPES = new Set(['badge_earned']);

export class NotificationsService {
    constructor(notificationsRepository, pushNotificationsService = null) {
        this.notificationsRepository = notificationsRepository;
        this.pushNotificationsService = pushNotificationsService;
    }

    async createNotification({ userId, actorId, type, itineraryId, commentId, badgeId }) {
        if (userId === actorId && !SELF_NOTIFICATION_TYPES.has(type)) return;

        const preferences = await this.notificationsRepository.getPreferences(userId);
        const preferenceKey = NOTIFICATION_TYPE_PREFERENCE_KEY[type];
        if (preferenceKey && !preferences[preferenceKey]) return;

        const created = await this.notificationsRepository.create({ userId, actorId, type, itineraryId, commentId, badgeId });
        if (!created || !this._shouldPush(preferences, type, created)) return;

        // Callers fire this with .catch(() => {}), so a push failure would
        // otherwise vanish without a trace.
        await this.pushNotificationsService
            .sendNotificationPush({ userId, actorId, type, itineraryId, commentId })
            .catch(err => logger.error('[push] failed to send notification push:', err));
    }

    _shouldPush(preferences, type, { grouped }) {
        if (!this.pushNotificationsService || !preferences.pushEnabled) return false;
        return !grouped || PUSH_ON_EVERY_EVENT_TYPES.has(type);
    }

    async getPreferences(userId) {
        return this.notificationsRepository.getPreferences(userId);
    }

    async updatePreferences(userId, preferences) {
        return this.notificationsRepository.upsertPreferences(userId, preferences);
    }

    async getNotifications(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [notifications, totalCount] = await Promise.all([
            this.notificationsRepository.getByUserId(userId, limit, offset),
            this.notificationsRepository.getTotalCount(userId),
        ]);
        return {
            notifications,
            currentPage: page,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        };
    }

    async markAllAsRead(userId) {
        await this.notificationsRepository.markAllAsRead(userId);
    }

    async getUnreadCount(userId) {
        return this.notificationsRepository.getUnreadCount(userId);
    }
}
