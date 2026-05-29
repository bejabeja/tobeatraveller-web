import { Router } from "express";
import { LikesController } from "../controllers/likesController.js";
import { LikesRepository } from "../repositories/likesRepository.js";
import { LikesService } from "../services/likesService.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { NotificationsService } from "../services/notificationsService.js";

export const createLikesRouter = () => {
    const router = Router();

    const likesRepository = new LikesRepository();
    const itineraryRepository = new ItineraryRepository();
    const notificationsRepository = new NotificationsRepository();
    const notificationsService = new NotificationsService(notificationsRepository);
    const likesService = new LikesService(likesRepository, notificationsService, itineraryRepository);
    const likesController = new LikesController(likesService);

    router.post('/:itineraryId', likesController.toggleLike.bind(likesController));
    router.get('/:itineraryId', likesController.isLiked.bind(likesController));

    return router;
};
