import { ValidationError } from '../errors/ValidationError.js';

export class ItinerariesController {
    constructor(itinerariesService) {
        this.itinerariesService = itinerariesService;
    }

    async filterItinerariesBy(req, res, next) {
        try {
            const { category = 'all', destination = '', page = 1, limit = 10, sortBy = 'recent', ...restFilters } = req.query;
            const filters = {
                category,
                destination,
                sortBy,
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

    async getStats(req, res, next) {
        try {
            const stats = await this.itinerariesService.getStats();
            res.status(200).json(stats);
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

    async getDestinations(req, res, next) {
        try {
            const destinations = await this.itinerariesService.getDestinations();
            res.status(200).json(destinations);
        } catch (error) {
            next(error);
        }
    }

    async getPlacesInBounds(req, res, next) {
        try {
            const minLat = parseFloat(req.query.minLat);
            const maxLat = parseFloat(req.query.maxLat);
            const minLon = parseFloat(req.query.minLon);
            const maxLon = parseFloat(req.query.maxLon);

            if ([minLat, maxLat, minLon, maxLon].some(Number.isNaN)) {
                return next(new ValidationError('minLat, maxLat, minLon and maxLon are required'));
            }
            if (minLat > maxLat || minLon > maxLon) {
                return next(new ValidationError('Invalid bounds: min must not be greater than max'));
            }

            const places = await this.itinerariesService.getPlacesInBounds({ minLat, maxLat, minLon, maxLon });
            res.status(200).json(places);
        } catch (error) {
            next(error);
        }
    }

    async getFeed(req, res, next) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const result = await this.itinerariesService.getFeed(userId, page);
            res.status(200).json(result);
        } catch (error) {
            next(error);
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

    async getMyItineraries(req, res, next) {
        try {
            const itineraries = await this.itinerariesService.getAllItinerariesByUserId(req.user.id);
            res.status(200).json(itineraries)
        } catch (error) {
            next(error)
        }
    }
}