import { userIdParamSchema } from "../utils/schemasValidation.js";
import { ValidationError } from "../errors/ValidationError.js";

export class BlocksController {
    constructor(blocksService) {
        this.blocksService = blocksService;
    }

    async block(req, res, next) {
        const userId = userIdParamSchema.safeParse(req.params.userId);
        if (!userId.success) return next(new ValidationError("Invalid user id"));
        try {
            await this.blocksService.block(req.user.id, userId.data);
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async unblock(req, res, next) {
        const userId = userIdParamSchema.safeParse(req.params.userId);
        if (!userId.success) return next(new ValidationError("Invalid user id"));
        try {
            await this.blocksService.unblock(req.user.id, userId.data);
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async getStatus(req, res, next) {
        const userId = userIdParamSchema.safeParse(req.params.userId);
        if (!userId.success) return next(new ValidationError("Invalid user id"));
        try {
            return res.status(200).json(await this.blocksService.getStatus(req.user.id, userId.data));
        } catch (error) {
            next(error);
        }
    }

    async listBlocked(req, res, next) {
        try {
            return res.status(200).json(await this.blocksService.getBlockedUsers(req.user.id));
        } catch (error) {
            next(error);
        }
    }
}
