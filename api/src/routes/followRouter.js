import { Router } from "express";
import { FollowController } from "../controllers/followController.js";
import { BadgeRepository } from "../repositories/badgeRepository.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { BadgeService } from "../services/badgeService.js";
import { FollowService } from "../services/followService.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";

export const createFollowRouter = () => {
    const router = Router();
    const userRepository = new UserRepository();
    const followRepository = new FollowRepository();
    const notificationsRepository = new NotificationsRepository();
    const itineraryRepository = new ItineraryRepository();
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, itineraryRepository);
    const notificationsService = new NotificationsService(notificationsRepository, pushNotificationsService);
    const badgeService = new BadgeService(new BadgeRepository(), notificationsService);
    const followService = new FollowService(userRepository, followRepository, notificationsService, badgeService);
    const followController = new FollowController(followService);

    router.post("/:id/follow", followController.followUser.bind(followController));
    router.delete("/:id/follow", followController.unfollowUser.bind(followController));
    router.get("/:id/followers", followController.getFollowers.bind(followController));
    router.get("/:id/following", followController.getFollowing.bind(followController));

    return router;
};
