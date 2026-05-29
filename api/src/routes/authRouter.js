import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AuthService } from "../services/authService.js";
import { EmailService } from "../services/emailService.js";
import { UserService } from "../services/userService.js";

export const createAuthRouter = () => {
    const router = Router();
    const userRepository = new UserRepository();
    const itinerariesRepository = new ItineraryRepository();
    const followRepository = new FollowRepository();
    const emailService = new EmailService();
    const userService = new UserService(userRepository, itinerariesRepository, followRepository, emailService);
    const authService = new AuthService(userRepository);
    const authController = new AuthController(userService, authService);

    router.post("/create", authController.create.bind(authController));
    router.post("/login", authController.login.bind(authController));
    router.post("/logout", authController.logout.bind(authController));

    return router;
};
