import { Router } from "express";
import { VanLogController } from "../controllers/vanLogController.js";
import { upload } from "../middlewares/uploadImage.js";
import { VanLogRepository } from "../repositories/vanLogRepository.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
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
    const cloudinaryService = new CloudinaryService();
    const itineraryRepository = new ItineraryRepository();
    const userRepository = new UserRepository();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, itineraryRepository);
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const badgeService = new BadgeService(new BadgeRepository(), notificationsService);
    const vanLogService = new VanLogService(vanLogRepository, cloudinaryService, itineraryRepository, userRepository, badgeService);
    const vanLogController = new VanLogController(vanLogService);

    router.get('/stats', vanLogController.getStats.bind(vanLogController));
    router.get('/', vanLogController.getMyEntries.bind(vanLogController));
    router.post('/', vanLogController.createEntry.bind(vanLogController));
    router.patch('/:id', vanLogController.updateEntry.bind(vanLogController));
    router.delete('/:id', vanLogController.deleteEntry.bind(vanLogController));
    router.post('/:id/receipt-photo', upload.single('receipt'), vanLogController.uploadReceiptPhoto.bind(vanLogController));
    router.delete('/:id/receipt-photo', vanLogController.deleteReceiptPhoto.bind(vanLogController));

    return router;
};
