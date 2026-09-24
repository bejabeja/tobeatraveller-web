import { Router } from 'express';
import { PushTokensController } from '../controllers/pushTokensController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireCronSecret } from '../middlewares/requireCronSecret.js';
import { ItineraryRepository } from '../repositories/itineraryRepository.js';
import { PushTokensRepository } from '../repositories/pushTokensRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { PushNotificationsService } from '../services/pushNotificationsService.js';

export const createPushTokensRouter = () => {
    const router = Router();

    const pushNotificationsService = new PushNotificationsService(
        new PushTokensRepository(), new UserRepository(), new ItineraryRepository()
    );
    const pushTokensController = new PushTokensController(pushNotificationsService);

    router.post('/', authenticate, pushTokensController.register.bind(pushTokensController));
    router.delete('/', authenticate, pushTokensController.unregister.bind(pushTokensController));
    router.get('/scheduled-purge', requireCronSecret, pushTokensController.purgeScheduled.bind(pushTokensController));

    return router;
};
