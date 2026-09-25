import { Router } from 'express';
import { RecapController } from '../controllers/recapController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireCronSecret } from '../middlewares/requireCronSecret.js';
import { ItineraryRepository } from '../repositories/itineraryRepository.js';
import { NotificationsRepository } from '../repositories/notificationsRepository.js';
import { PushTokensRepository } from '../repositories/pushTokensRepository.js';
import { RecapRepository } from '../repositories/recapRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { NotificationsService } from '../services/notificationsService.js';
import { PushNotificationsService } from '../services/pushNotificationsService.js';
import { RecapService } from '../services/recapService.js';

export const createRecapRouter = () => {
    const router = Router();

    const pushNotificationsService = new PushNotificationsService(
        new PushTokensRepository(), new UserRepository(), new ItineraryRepository()
    );
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const recapController = new RecapController(new RecapService(new RecapRepository(), notificationsService));

    router.get('/me', authenticate, recapController.getMyRecap.bind(recapController));
    router.get('/scheduled-announce', requireCronSecret, recapController.announceScheduled.bind(recapController));

    return router;
};
