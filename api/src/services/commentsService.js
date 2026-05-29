import { AuthError } from "../errors/AuthError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class CommentsService {
    constructor(commentsRepository, userRepository, notificationsService = null, itineraryRepository = null) {
        this.commentsRepository = commentsRepository;
        this.userRepository = userRepository;
        this.notificationsService = notificationsService;
        this.itineraryRepository = itineraryRepository;
    }

    async addComment(userId, itineraryId, content) {
        const result = await this.commentsRepository.addComment(userId, itineraryId, content);

        const itinerary = await this.itineraryRepository?.findById(itineraryId);
        if (itinerary?.userId && itinerary.userId !== userId) {
            this.notificationsService?.createNotification({
                userId: itinerary.userId, actorId: userId, type: 'comment',
                itineraryId, commentId: result.id
            }).catch(() => {});
        }

        return result;
    }

    async getCommentsByItinerary(itineraryId) {
        const comments = await this.commentsRepository.getCommentsByItinerary(itineraryId);
        return comments.map(comment => comment.toDTO());
    }

    async deleteComment(commentId, userId) {
        const comment = await this.commentsRepository.getCommentById(commentId);
        if (!comment) throw new NotFoundError("Comment not found");

        if (comment.user.id !== userId) {
            throw new AuthError();
        }

        await this.commentsRepository.deleteComment(commentId)
    }
}