export class LikesService {
    constructor(likesRepository, notificationsService = null, itineraryRepository = null) {
        this.likesRepository = likesRepository;
        this.notificationsService = notificationsService;
        this.itineraryRepository = itineraryRepository;
    }

    async toggleLike(itineraryId, userId) {
        const liked = await this.likesRepository.isLiked(itineraryId, userId);
        if (liked) {
            await this.likesRepository.removeLike(itineraryId, userId);
        } else {
            await this.likesRepository.addLike(itineraryId, userId);

            const itinerary = await this.itineraryRepository?.findById(itineraryId);
            if (itinerary?.userId && itinerary.userId !== userId) {
                this.notificationsService?.createNotification({
                    userId: itinerary.userId, actorId: userId, type: 'like', itineraryId
                }).catch(() => {});
            }
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
