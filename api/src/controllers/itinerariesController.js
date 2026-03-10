export class ItinerariesController {
    constructor(itinerariesService) {
        this.itinerariesService = itinerariesService;
    }

    async filterItinerariesBy(req, res, next) {
        try {
            const { category = 'all', destination = '', page = 1, limit = 10, ...restFilters } = req.query;
            const filters = {
                category,
                destination,
                page: parseInt(page),
                limit: parseInt(limit),
                ...restFilters
            };

            if (filters.budgetMin) filters.budgetMin = parseFloat(filters.budgetMin);
            if (filters.budgetMax) filters.budgetMax = parseFloat(filters.budgetMax);
            if (filters.durationMin) filters.durationMin = parseInt(filters.durationMin);
            if (filters.durationMax) filters.durationMax = parseInt(filters.durationMax);
            if (filters.startDateMin) filters.startDateMin = new Date(filters.startDateMin);
            if (filters.startDateMax) filters.startDateMax = new Date(filters.startDateMax);

            const {
                itineraries,
                totalPages,
                totalItems
            } = await this.itinerariesService.getFilteredItineraries(filters);
            res.status(200).json({
                itineraries,
                totalPages,
                totalItems,
                page: filters.page
            });
        } catch (error) {
            next(error);
        }
    }

    async featuredItineraries(req, res, next) {
        try {
            const itineraries = await this.itinerariesService.getFeaturedItineraries();
            res.status(200).json(itineraries)
        } catch (error) {
            next(error)
        }
    }

    async getItinerariesByUserId(req, res, next) {
        try {
            const { id } = req.params;
            const itineraries = await this.itinerariesService.getItinerariesByUserId(id);
            res.status(200).json(itineraries)
        } catch (error) {
            next(error)
        }
    }
}