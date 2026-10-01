import { Router } from "express";
import { SubscriptionController } from "../controllers/subscriptionController.js";
import { requireCronSecret } from "../middlewares/requireCronSecret.js";
import { SubscriptionRepository } from "../repositories/subscriptionRepository.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { EmailService } from "../services/emailService.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { stripeClient } from "../services/stripeClient.js";

// Mounted in index.js before the authenticated /subscription routes: the
// scheduled job has a cron secret, not a user session.
export const createSubscriptionCronRouter = () => {
    const router = Router();

    const subscriptionService = new SubscriptionService(
        new SubscriptionRepository(), new UserRepository(), auditLogService, stripeClient, new EmailService(),
    );
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.get('/', requireCronSecret, subscriptionController.sendTrialRemindersScheduled.bind(subscriptionController));

    return router;
};
