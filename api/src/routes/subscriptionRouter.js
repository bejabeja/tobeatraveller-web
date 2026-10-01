import { Router } from "express";
import { SubscriptionController } from "../controllers/subscriptionController.js";
import { SubscriptionRepository } from "../repositories/subscriptionRepository.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { stripeClient } from "../services/stripeClient.js";
import { EmailService } from "../services/emailService.js";

export const createSubscriptionRouter = () => {
    const router = Router();

    const subscriptionRepository = new SubscriptionRepository();
    const userRepository = new UserRepository();
    const subscriptionService = new SubscriptionService(subscriptionRepository, userRepository, auditLogService, stripeClient, new EmailService());
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.get('/', subscriptionController.getMySubscription.bind(subscriptionController));
    router.post('/checkout-session', subscriptionController.createCheckoutSession.bind(subscriptionController));
    router.post('/portal-session', subscriptionController.createPortalSession.bind(subscriptionController));
    router.post('/resume', subscriptionController.resumeSubscription.bind(subscriptionController));

    return router;
};
