const NOTIFICATION_TYPE_PREFERENCE_KEY = {
    comment: 'notifyOnComment',
    like: 'notifyOnLike',
    follow: 'notifyOnFollow',
};

export class NotificationsService {
    constructor(notificationsRepository) {
        this.notificationsRepository = notificationsRepository;
    }

    async createNotification({ userId, actorId, type, itineraryId, commentId }) {
        if (userId === actorId) return;

        const preferenceKey = NOTIFICATION_TYPE_PREFERENCE_KEY[type];
        if (preferenceKey) {
            const preferences = await this.notificationsRepository.getPreferences(userId);
            if (!preferences[preferenceKey]) return;
        }

        await this.notificationsRepository.create({ userId, actorId, type, itineraryId, commentId });
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
