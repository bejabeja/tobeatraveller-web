import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { PasswordResetRepository } from "../repositories/passwordResetRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AuthService } from "../services/authService.js";
import { EmailService } from "../services/emailService.js";
import { UserService } from "../services/userService.js";

export const createAuthRouter = () => {
    const router = Router();
    const userRepository = new UserRepository();
    const itinerariesRepository = new ItineraryRepository();
    const followRepository = new FollowRepository();
    const passwordResetRepository = new PasswordResetRepository();
    const emailService = new EmailService();
    const userService = new UserService(userRepository, itinerariesRepository, followRepository, emailService);
    const authService = new AuthService(userRepository, emailService, passwordResetRepository);
    const authController = new AuthController(userService, authService);

    router.post("/create", authController.create.bind(authController));
    router.post("/login", authController.login.bind(authController));
    router.post("/logout", authController.logout.bind(authController));
    router.post("/forgot-password", authController.forgotPassword.bind(authController));
    router.post("/reset-password", authController.resetPassword.bind(authController));

    return router;
};
