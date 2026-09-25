import { Router } from "express";
import { VanLogController } from "../controllers/vanLogController.js";
import { VanLogRepository } from "../repositories/vanLogRepository.js";
import { VanLogService } from "../services/vanLogService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { BadgeRepository } from "../repositories/badgeRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { BadgeService } from "../services/badgeService.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";

export const createVanLogsRouter = () => {
    const router = Router();

    const vanLogRepository = new VanLogRepository();
    const userRepository = new UserRepository();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, new ItineraryRepository());
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const badgeService = new BadgeService(new BadgeRepository(), notificationsService);
    const vanLogService = new VanLogService(vanLogRepository, userRepository, badgeService);
    const vanLogController = new VanLogController(vanLogService);

    router.get('/stats', vanLogController.getStats.bind(vanLogController));
    router.get('/', vanLogController.getMyEntries.bind(vanLogController));
    router.post('/', vanLogController.createEntry.bind(vanLogController));
    router.patch('/:id', vanLogController.updateEntry.bind(vanLogController));
    router.delete('/:id', vanLogController.deleteEntry.bind(vanLogController));

    return router;
};
