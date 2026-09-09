import { ValidationError } from '../errors/ValidationError.js';
import { updateNotificationPreferencesSchema } from '../utils/schemasValidation.js';

export class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }

    async getNotifications(req, res, next) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const result = await this.notificationsService.getNotifications(userId, page);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            await this.notificationsService.markAllAsRead(userId);
            res.status(200).json({ message: 'Notifications marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req, res, next) {
        try {
            const userId = req.user.id;
            const count = await this.notificationsService.getUnreadCount(userId);
            res.status(200).json({ count });
        } catch (error) {
            next(error);
        }
    }

    async getPreferences(req, res, next) {
        try {
            const userId = req.user.id;
            const preferences = await this.notificationsService.getPreferences(userId);
            res.status(200).json(preferences);
        } catch (error) {
            next(error);
        }
    }

    async updatePreferences(req, res, next) {
        try {
            const result = updateNotificationPreferencesSchema.safeParse(req.body);
            if (!result.success) {
                return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
            }

            const userId = req.user.id;
            const preferences = await this.notificationsService.updatePreferences(userId, result.data);
            res.status(200).json(preferences);
        } catch (error) {
            next(error);
        }
    }
}
