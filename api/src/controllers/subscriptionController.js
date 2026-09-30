import { ValidationError } from '../errors/ValidationError.js';
import { createCheckoutSessionSchema } from '../utils/schemasValidation.js';
import { logger } from '../utils/logger.js';

export class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    async createCheckoutSession(req, res, next) {
        const result = createCheckoutSessionSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const session = await this.subscriptionService.createCheckoutSession(req.user.id, result.data.plan, { startTrial: result.data.startTrial });
            res.status(200).json(session);
        } catch (error) {
            next(error);
        }
    }

    async getMySubscription(req, res, next) {
        try {
            const subscription = await this.subscriptionService.getMySubscription(req.user.id);
            res.status(200).json(subscription);
        } catch (error) {
            next(error);
        }
    }

    async resumeSubscription(req, res, next) {
        try {
            const subscription = await this.subscriptionService.resumeSubscription(req.user.id);
            res.status(200).json(subscription);
        } catch (error) {
            next(error);
        }
    }

    async createPortalSession(req, res, next) {
        try {
            const session = await this.subscriptionService.createPortalSession(req.user.id);
            res.status(200).json(session);
        } catch (error) {
            next(error);
        }
    }

    // Stripe expects a fast response in a specific shape (400 on a bad
    // signature, 2xx once the event is handled) and retries on failure, so
    // this bypasses the usual next(error) -> errorHandler path.
    async handleWebhook(req, res) {
        const signature = req.headers['stripe-signature'];
        let event;
        try {
            event = this.subscriptionService.verifyWebhookEvent(req.body, signature);
        } catch (error) {
            logger.warn(`Stripe webhook signature verification failed: ${error.message}`);
            return res.status(400).send(`Webhook Error: ${error.message}`);
        }

        try {
            await this.subscriptionService.handleWebhookEvent(event);
            res.status(200).json({ received: true });
        } catch (error) {
            logger.error(`Stripe webhook handling failed for event ${event.id}:`, error);
            res.status(500).json({ error: 'Webhook handling failed' });
        }
    }
}
