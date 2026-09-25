import { ValidationError } from '../errors/ValidationError.js';
import { userIdParamSchema } from '../utils/schemasValidation.js';

export class BadgeController {
    constructor(badgeService) {
        this.badgeService = badgeService;
    }

    async getUserPassport(req, res, next) {
        const result = userIdParamSchema.safeParse(req.params.id);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid user id"));
        }
        try {
            const passport = await this.badgeService.getPassport(result.data, req.user?.id ?? null);
            res.status(200).json(passport);
        } catch (error) {
            next(error);
        }
    }
}
