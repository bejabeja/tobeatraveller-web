import { Router } from 'express';
import { NotificationsController } from '../controllers/notificationsController.js';
import { NotificationsRepository } from '../repositories/notificationsRepository.js';
import { NotificationsService } from '../services/notificationsService.js';

export const createNotificationsRouter = () => {
    const router = Router();

    const notificationsRepository = new NotificationsRepository();
    const notificationsService = new NotificationsService(notificationsRepository);
    const notificationsController = new NotificationsController(notificationsService);

    router.get('/', notificationsController.getNotifications.bind(notificationsController));
    router.patch('/read', notificationsController.markAllAsRead.bind(notificationsController));
    router.get('/unread-count', notificationsController.getUnreadCount.bind(notificationsController));

    return router;
};
