export class LikesController {
    constructor(likesService) {
        this.likesService = likesService;
    }

    async toggleLike(req, res, next) {
        try {
            const { itineraryId } = req.params;
            const userId = req.user.id;
            const result = await this.likesService.toggleLike(itineraryId, userId);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async isLiked(req, res, next) {
        try {
            const { itineraryId } = req.params;
            const userId = req.user.id;
            const result = await this.likesService.isLiked(itineraryId, userId);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
