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

    async getItinerariesByUserId(userId) {
        const itineraries = await this.itinerariesRepository.findByUserId(userId);
        if (!itineraries.length) {
            return [];
        }

        const enriched = await Promise.all(itineraries.map(async (itinerary) => {
            const places = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
            for (const place of places) {
                itinerary.addPlace(place);
            }
            return itinerary.toDTO();
        }));

        return enriched;
    }
}
