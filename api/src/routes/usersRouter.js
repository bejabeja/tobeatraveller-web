import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { upload } from "../middlewares/uploadImage.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { UserService } from "../services/userService.js";

export const createUsersRouter = () => {
    const router = Router();
    const itinerariesRepository = new ItineraryRepository();
    const userRepository = new UserRepository();
    const followRepository = new FollowRepository()
    const userService = new UserService(userRepository, itinerariesRepository, followRepository);
    const cloudinaryService = new CloudinaryService();
    const userController = new UserController(userService, cloudinaryService);

    router.get("/", authenticate, userController.getAllUsers.bind(userController));
    router.get("/me", authenticate, userController.getUserMe.bind(userController));
    router.put("/me", authenticate, upload.single("avatar"), userController.updateUserMe.bind(userController));
    router.get("/featured", userController.getFeaturedUsers.bind(userController));
    router.get("/all", userController.getAllUsersFiltered.bind(userController));
    router.get("/check-username", userController.checkUsernameAvailable.bind(userController));
    router.get("/:id", userController.getUserById.bind(userController));

    return router;
};
