import { Router } from 'express';
import { BadgeController } from '../controllers/badgeController.js';
import { requireCronSecret } from '../middlewares/requireCronSecret.js';
import { BadgeRepository } from '../repositories/badgeRepository.js';
import { ItineraryRepository } from '../repositories/itineraryRepository.js';
import { NotificationsRepository } from '../repositories/notificationsRepository.js';
import { PushTokensRepository } from '../repositories/pushTokensRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { BadgeService } from '../services/badgeService.js';
import { NotificationsService } from '../services/notificationsService.js';
import { PushNotificationsService } from '../services/pushNotificationsService.js';

export const createBadgesRouter = () => {
    const router = Router();

    const userRepository = new UserRepository();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, new ItineraryRepository());
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const badgeController = new BadgeController(new BadgeService(new BadgeRepository(), notificationsService, userRepository));

    // Daily: stamps the countries of the trips starting today.
    router.get('/scheduled-evaluate', requireCronSecret, badgeController.evaluateTripsStartingTodayScheduled.bind(badgeController));

    return router;
};
