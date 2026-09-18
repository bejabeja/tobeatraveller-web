import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { PasswordResetRepository } from "../repositories/passwordResetRepository.js";
import { ReferralRepository } from "../repositories/referralRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { AuthService } from "../services/authService.js";
import { EmailService } from "../services/emailService.js";
import { ReferralService } from "../services/referralService.js";
import { UserService } from "../services/userService.js";

export const createAuthRouter = () => {
    const router = Router();
    const userRepository = new UserRepository();
    const itinerariesRepository = new ItineraryRepository();
    const followRepository = new FollowRepository();
    const passwordResetRepository = new PasswordResetRepository();
    const referralRepository = new ReferralRepository();
    const emailService = new EmailService();
    const referralService = new ReferralService(referralRepository, userRepository, auditLogService);
    const userService = new UserService(
        userRepository, itinerariesRepository, followRepository, emailService,
        null, null, null, null, null, null, null, referralService
    );
    const authService = new AuthService(userRepository, emailService, passwordResetRepository, auditLogService);
    const authController = new AuthController(userService, authService);

    router.post("/create", authController.create.bind(authController));
    router.post("/login", authController.login.bind(authController));
    router.post("/refresh", authController.refresh.bind(authController));
    router.post("/logout", authController.logout.bind(authController));
    router.post("/forgot-password", authController.forgotPassword.bind(authController));
    router.post("/reset-password", authController.resetPassword.bind(authController));

    return router;
};
