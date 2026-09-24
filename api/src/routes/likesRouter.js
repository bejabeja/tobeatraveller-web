import { Router } from "express";
import { LikesController } from "../controllers/likesController.js";
import { LikesRepository } from "../repositories/likesRepository.js";
import { LikesService } from "../services/likesService.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";
import { UserRepository } from "../repositories/userRepository.js";

export const createLikesRouter = () => {
    const router = Router();

    const likesRepository = new LikesRepository();
    const itineraryRepository = new ItineraryRepository();
    const notificationsRepository = new NotificationsRepository();
    const userRepository = new UserRepository();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, itineraryRepository);
    const notificationsService = new NotificationsService(notificationsRepository, pushNotificationsService);
    const likesService = new LikesService(likesRepository, notificationsService, itineraryRepository);
    const likesController = new LikesController(likesService);

    router.post('/:itineraryId', likesController.toggleLike.bind(likesController));
    router.get('/:itineraryId', likesController.isLiked.bind(likesController));

    return router;
};
