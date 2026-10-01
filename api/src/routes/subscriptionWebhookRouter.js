import express, { Router } from "express";
import { SubscriptionController } from "../controllers/subscriptionController.js";
import { SubscriptionRepository } from "../repositories/subscriptionRepository.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { stripeClient } from "../services/stripeClient.js";
import { EmailService } from "../services/emailService.js";

// Mounted in index.js before the app-wide express.json(): Stripe's signature
// verification needs the raw request body, which express.json() would have
// already consumed and parsed by the time a router mounted after it runs.
export const createSubscriptionWebhookRouter = () => {
    const router = Router();

    const subscriptionRepository = new SubscriptionRepository();
    const userRepository = new UserRepository();
    const subscriptionService = new SubscriptionService(subscriptionRepository, userRepository, auditLogService, stripeClient, new EmailService());
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.post('/', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook.bind(subscriptionController));

    return router;
};
