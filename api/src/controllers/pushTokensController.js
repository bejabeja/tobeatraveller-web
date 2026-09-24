import { ValidationError } from '../errors/ValidationError.js';
import { registerPushTokenSchema, unregisterPushTokenSchema } from '../utils/schemasValidation.js';

export class PushTokensController {
    constructor(pushNotificationsService) {
        this.pushNotificationsService = pushNotificationsService;
    }

    async register(req, res, next) {
        const result = registerPushTokenSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }

        try {
            await this.pushNotificationsService.registerToken(req.user.id, result.data);
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async unregister(req, res, next) {
        const result = unregisterPushTokenSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }

        try {
            await this.pushNotificationsService.unregisterToken(req.user.id, result.data.token);
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    // Hit by Vercel Cron (see vercel.json), authenticated via requireCronSecret
    // instead of a user session, so token retention enforces itself.
    async purgeScheduled(req, res, next) {
        try {
            const deletedCount = await this.pushNotificationsService.purgeStaleTokens();
            res.status(200).json({ deletedCount });
        } catch (error) {
            next(error);
        }
    }
}
