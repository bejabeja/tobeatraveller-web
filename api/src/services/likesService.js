export class LikesService {
    constructor(likesRepository) {
        this.likesRepository = likesRepository;
    }

    async toggleLike(itineraryId, userId) {
        const liked = await this.likesRepository.isLiked(itineraryId, userId);
        if (liked) {
            await this.likesRepository.removeLike(itineraryId, userId);
        } else {
            await this.likesRepository.addLike(itineraryId, userId);
        }
        const likesCount = await this.likesRepository.getLikesCount(itineraryId);
        return { isLiked: !liked, likesCount };
    }

    async isLiked(itineraryId, userId) {
        const [isLiked, likesCount] = await Promise.all([
            this.likesRepository.isLiked(itineraryId, userId),
            this.likesRepository.getLikesCount(itineraryId),
        ]);
        return { isLiked, likesCount };
    }
}
