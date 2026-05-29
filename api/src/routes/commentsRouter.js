import { Router } from "express";
import { CommentsController } from "../controllers/commentsController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { CommentsRepository } from "../repositories/commentsRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CommentsService } from "../services/commentsService.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { NotificationsService } from "../services/notificationsService.js";

export const createCommentsRouter = () => {
    const router = Router()

    const commentsRepository = new CommentsRepository()
    const userRepository = new UserRepository()
    const itineraryRepository = new ItineraryRepository()
    const notificationsRepository = new NotificationsRepository()
    const notificationsService = new NotificationsService(notificationsRepository)
    const commentsService = new CommentsService(commentsRepository, userRepository, notificationsService, itineraryRepository)
    const commentsController = new CommentsController(commentsService)

    router.get('/itinerary/:itineraryId', commentsController.getComments.bind(commentsController));
    router.post('/itinerary/:itineraryId', authenticate, commentsController.addComment.bind(commentsController));
    router.delete('/:commentId', authenticate, commentsController.deleteComment.bind(commentsController));

    return router;
}