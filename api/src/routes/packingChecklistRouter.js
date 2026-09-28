import { Router } from "express";
import { PackingChecklistController } from "../controllers/packingChecklistController.js";
import { PackingRemindersController } from "../controllers/packingRemindersController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { requireCronSecret } from "../middlewares/requireCronSecret.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { PackingChecklistRepository } from "../repositories/packingChecklistRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { PackingListRepository } from "../repositories/packingListRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PackingChecklistService } from "../services/packingChecklistService.js";
import { PackingRemindersService } from "../services/packingRemindersService.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";

export const createPackingChecklistRouter = () => {
    const router = Router();

    const packingChecklistRepository = new PackingChecklistRepository();
    const packingListRepository = new PackingListRepository();
    const userRepository = new UserRepository();
    const itineraryRepository = new ItineraryRepository();
    const packingChecklistService = new PackingChecklistService(
        packingChecklistRepository, packingListRepository, userRepository, itineraryRepository
    );
    const packingChecklistController = new PackingChecklistController(packingChecklistService);
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, itineraryRepository);
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const packingRemindersController = new PackingRemindersController(new PackingRemindersService(packingListRepository, notificationsService));

    // Triggered by Vercel Cron with its shared secret instead of a user's
    // session, so it sits before the authentication every other route needs.
    router.get('/scheduled-remind', requireCronSecret, packingRemindersController.sendTripRemindersScheduled.bind(packingRemindersController));
    router.use(authenticate);

    router.get('/lists', packingChecklistController.getLists.bind(packingChecklistController));
    router.post('/lists', packingChecklistController.createList.bind(packingChecklistController));
    router.patch('/lists/:listId', packingChecklistController.updateList.bind(packingChecklistController));
    router.delete('/lists/:listId', packingChecklistController.deleteList.bind(packingChecklistController));
    router.post('/lists/:listId/duplicate', packingChecklistController.duplicateList.bind(packingChecklistController));
    router.post('/lists/:listId/restart', packingChecklistController.restartList.bind(packingChecklistController));
    router.get('/lists/:listId/items', packingChecklistController.getItems.bind(packingChecklistController));
    router.post('/lists/:listId/items', packingChecklistController.addItem.bind(packingChecklistController));
    router.patch('/items/:id', packingChecklistController.updateItem.bind(packingChecklistController));
    router.delete('/items/:id', packingChecklistController.deleteItem.bind(packingChecklistController));

    return router;
};
