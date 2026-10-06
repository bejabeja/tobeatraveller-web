import { commentSchema } from "../utils/schemasValidation.js";
import { ValidationError } from "../errors/ValidationError.js";

const DEFAULT_COMMENTS_PAGE_SIZE = 50;
const MAX_COMMENTS_PAGE_SIZE = 100;

export class CommentsController {
    constructor(commentsService) {
        this.commentsService = commentsService
    }

    async addComment(req, res, next) {
        const result = commentSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid comment"));
        }
        try {
            const userId = req.user.id;
            const itineraryId = req.params.itineraryId;
            const content = result.data.text;

            const comment = await this.commentsService.addComment(userId, itineraryId, content);
            return res.status(201).json({ message: 'Comment added', comment });
        } catch (error) {
            next(error);
        }
    }

    async getComments(req, res, next) {
        try {
            const itineraryId = req.params.itineraryId;

            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_COMMENTS_PAGE_SIZE, 1), MAX_COMMENTS_PAGE_SIZE);
            const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
            const page = await this.commentsService.getCommentsPageByItinerary(itineraryId, req.user?.id, { limit, offset });

            return res.status(200).json(page);
        } catch (error) {
            next(error);
        }
    }

    async deleteComment(req, res, next) {
        try {
            const commentId = req.params.commentId;
            const userId = req.user.id;

            await this.commentsService.deleteComment(commentId, userId);

            return res.status(204).json({ message: "Comment deleted" });
        } catch (error) {
            next(error);
        }
    }
}