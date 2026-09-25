import { Router } from "express";
import { LifeDiaryController } from "../controllers/lifeDiaryController.js";
import { upload } from "../middlewares/uploadImage.js";
import { LifeDiaryRepository } from "../repositories/lifeDiaryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { LifeDiaryService } from "../services/lifeDiaryService.js";
import { BadgeRepository } from "../repositories/badgeRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { BadgeService } from "../services/badgeService.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";

export const createLifeDiaryRouter = () => {
    const router = Router();

    const lifeDiaryRepository = new LifeDiaryRepository();
    const userRepository = new UserRepository();
    const cloudinaryService = new CloudinaryService();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, new ItineraryRepository());
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const badgeService = new BadgeService(new BadgeRepository(), notificationsService);
    const lifeDiaryService = new LifeDiaryService(lifeDiaryRepository, cloudinaryService, userRepository, badgeService);
    const lifeDiaryController = new LifeDiaryController(lifeDiaryService);

    const uploadImages = upload.fields([{ name: 'images', maxCount: 6 }]);

    router.get('/usage', lifeDiaryController.getFreeTierUsage.bind(lifeDiaryController));
    router.get('/', lifeDiaryController.getMyEntries.bind(lifeDiaryController));
    router.post('/', uploadImages, lifeDiaryController.createEntry.bind(lifeDiaryController));
    router.patch('/:id', uploadImages, lifeDiaryController.updateEntry.bind(lifeDiaryController));
    router.delete('/:id', lifeDiaryController.deleteEntry.bind(lifeDiaryController));

    return router;
};
