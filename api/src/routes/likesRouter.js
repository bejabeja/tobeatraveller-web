import { Router } from "express";
import { LikesController } from "../controllers/likesController.js";
import { LikesRepository } from "../repositories/likesRepository.js";
import { LikesService } from "../services/likesService.js";

export const createLikesRouter = () => {
    const router = Router();

    const likesRepository = new LikesRepository();
    const likesService = new LikesService(likesRepository);
    const likesController = new LikesController(likesService);

    router.post('/:itineraryId', likesController.toggleLike.bind(likesController));
    router.get('/:itineraryId', likesController.isLiked.bind(likesController));

    return router;
};
