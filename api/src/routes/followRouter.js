import { Router } from "express";
import { FollowController } from "../controllers/followController.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { FollowService } from "../services/followService.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { NotificationsService } from "../services/notificationsService.js";

export const createFollowRouter = () => {
    const router = Router();
    const userRepository = new UserRepository();
    const followRepository = new FollowRepository();
    const notificationsRepository = new NotificationsRepository();
    const notificationsService = new NotificationsService(notificationsRepository);
    const followService = new FollowService(userRepository, followRepository, notificationsService);
    const followController = new FollowController(followService);

    router.post("/:id/follow", followController.followUser.bind(followController));
    router.delete("/:id/follow", followController.unfollowUser.bind(followController));
    router.get("/:id/followers", followController.getFollowers.bind(followController));
    router.get("/:id/following", followController.getFollowing.bind(followController));

    return router;
};
