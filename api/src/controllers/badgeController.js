import { ValidationError } from '../errors/ValidationError.js';
import {
    declaredCountriesSchema, PASSPORT_PUBLIC_VIEW, passportQuerySchema, userIdParamSchema,
} from '../utils/schemasValidation.js';

export class BadgeController {
    constructor(badgeService) {
        this.badgeService = badgeService;
    }

    async getUserPassport(req, res, next) {
        const idResult = userIdParamSchema.safeParse(req.params.id);
        if (!idResult.success) {
            return next(new ValidationError(idResult.error.errors[0]?.message || "Invalid user id"));
        }
        const queryResult = passportQuerySchema.safeParse(req.query);
        if (!queryResult.success) {
            return next(new ValidationError(queryResult.error.errors[0]?.message || "Invalid passport view"));
        }
        try {
            const passport = await this.badgeService.getPassport(idResult.data, req.user?.id ?? null, {
                publicView: queryResult.data.view === PASSPORT_PUBLIC_VIEW,
            });
            res.status(200).json(passport);
        } catch (error) {
            next(error);
        }
    }

    async updateMyDeclaredCountries(req, res, next) {
        const result = declaredCountriesSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid countries"));
        }
        try {
            await this.badgeService.updateDeclaredCountries(req.user.id, result.data.countries);
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async getMyLeaderboard(req, res, next) {
        try {
            const leaderboard = await this.badgeService.getFollowingLeaderboard(req.user.id);
            res.status(200).json(leaderboard);
        } catch (error) {
            next(error);
        }
    }
}
