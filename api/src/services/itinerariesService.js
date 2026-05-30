export class ItinerariesService {
    constructor(itinerariesRepository, userRepository, placesRepository) {
        this.itinerariesRepository = itinerariesRepository;
        this.userRepository = userRepository;
        this.placesRepository = placesRepository;
    }

    async getFilteredItineraries(filters) {
        const [totalItems, itineraries] = await Promise.all([
            this.itinerariesRepository.countByFilters(filters),
            this.itinerariesRepository.findByFilters(filters)
        ]);

        if (!itineraries.length) {
            return { itineraries: [], totalPages: 0, totalItems: 0, page: filters.page || 1 };
        }

        await Promise.all(
            itineraries.map(async (it) => {
                const user = await this.userRepository.getUserById(it.userId);
                if (user) it.addUser(user.toSimpleDTO());
            })
        );

        return {
            itineraries: itineraries.map(it => it.toSimpleDTO()),
            totalItems,
            totalPages: Math.ceil(totalItems / filters.limit),
            page: filters.page
        };
    }

    async getFeaturedItineraries() {
        const itineraries = await this.itinerariesRepository.findTopByLikes(3);
        await Promise.all(
            itineraries.map(async (itinerary) => {
                const user = await this.userRepository.getUserById(itinerary.userId);
                if (user) itinerary.addUser(user.toSimpleDTO());
            })
        );
        return itineraries.map(it => it.toSimpleDTO());
    }

    async getStats() {
        return this.itinerariesRepository.getStats();
    }

    async getDestinations() {
        return this.itinerariesRepository.getDestinations();
    }

    async getFeed(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [totalItems, itineraries] = await Promise.all([
            this.itinerariesRepository.getFeedCountByUserId(userId),
            this.itinerariesRepository.getFeedByUserId(userId, limit, offset),
        ]);

        return {
            itineraries: itineraries.map(it => it.toSimpleDTO()),
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            totalItems,
        };
    }

    async getItinerariesByUserId(userId) {
        const itineraries = await this.itinerariesRepository.findPublicByUserId(userId);
        return this._enrichItineraries(itineraries);
    }

    async getAllItinerariesByUserId(userId) {
        const itineraries = await this.itinerariesRepository.findByUserId(userId);
        return this._enrichItineraries(itineraries);
    }

    async _enrichItineraries(itineraries) {
        if (!itineraries.length) return [];
        return Promise.all(itineraries.map(async (itinerary) => {
            const places = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
            for (const place of places) itinerary.addPlace(place);
            return itinerary.toDTO();
        }));
    }
}
