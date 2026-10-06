import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
    failedLoginPerAccountRateLimit, failedLoginPerIpRateLimit,
    passwordResetPerAccountRateLimit, passwordResetPerIpRateLimit, signupPerIpRateLimit,
} from "../middlewares/authRateLimit.js";
import { perIpResendVerificationRateLimit, perUserResendVerificationRateLimit } from "../middlewares/emailVerificationRateLimit.js";
import { EmailVerificationRepository } from "../repositories/emailVerificationRepository.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { PasswordResetRepository } from "../repositories/passwordResetRepository.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { ReferralRepository } from "../repositories/referralRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { AuthService } from "../services/authService.js";
import { EmailService } from "../services/emailService.js";
import { EmailVerificationService } from "../services/emailVerificationService.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";
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
    // With the notifications and the email: a reward paid when someone confirms their
    // email has to tell whoever invited them, like one paid when they share a trip.
    const pushNotificationsService = new PushNotificationsService(new PushTokensRepository(), userRepository, itinerariesRepository);
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const referralService = new ReferralService(referralRepository, userRepository, auditLogService, notificationsService, emailService);
    const emailVerificationService = new EmailVerificationService(
        userRepository, new EmailVerificationRepository(), emailService, auditLogService, itinerariesRepository, referralService
    );
    const userService = new UserService(
        userRepository, itinerariesRepository, followRepository, emailService,
        null, null, null, null, null, null, null, referralService,
        null, null, null, null, null, emailVerificationService
    );
    const authService = new AuthService(userRepository, emailService, passwordResetRepository, auditLogService);
    const authController = new AuthController(userService, authService, emailVerificationService);

    router.post("/create", signupPerIpRateLimit, authController.create.bind(authController));
    router.post("/login", failedLoginPerIpRateLimit, failedLoginPerAccountRateLimit, authController.login.bind(authController));
    router.post("/refresh", authController.refresh.bind(authController));
    router.post("/logout", authController.logout.bind(authController));
    router.post("/forgot-password", passwordResetPerIpRateLimit, passwordResetPerAccountRateLimit, authController.forgotPassword.bind(authController));
    router.post("/reset-password", authController.resetPassword.bind(authController));
    router.post("/verify-email", authController.verifyEmail.bind(authController));
    router.post(
        "/resend-verification", authenticate, perIpResendVerificationRateLimit, perUserResendVerificationRateLimit,
        authController.resendVerification.bind(authController)
    );
    router.patch(
        "/unverified-email", authenticate, perIpResendVerificationRateLimit, perUserResendVerificationRateLimit,
        authController.changeUnverifiedEmail.bind(authController)
    );

    return router;
};
