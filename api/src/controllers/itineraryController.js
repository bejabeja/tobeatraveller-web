
export class ItineraryController {
    constructor(itineraryService) {
        this.itineraryService = itineraryService;
    }
    async getItineraryById(req, res, next) {
        try {
            const { id } = req.params;
            const itinerary = await this.itineraryService.getItineraryById(id);
            res.status(200).json(itinerary);
        } catch (error) {
            next(error);
        }
    }

    async createItinerary(req, res, next) {
        try {
            const { file } = req;
            const itineraryData = JSON.parse(req.body.itinerary);
            const newItinerary = await this.itineraryService.createItinerary(itineraryData, file);
            res.status(201).json(newItinerary);
        } catch (error) {
            next(error);
        }
    }

    async deleteItinerary(req, res, next) {
        try {
            const { id } = req.params;
            await this.itineraryService.deleteItinerary(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async updateItinerary(req, res, next) {
        try {
            const { id } = req.params;
            const { file } = req;
            const itineraryData = JSON.parse(req.body.itinerary);
            await this.itineraryService.updateItinerary(id, itineraryData, file);
            res.status(200).json({ message: "Itinerary updated successfully" });

        } catch (error) {
            next(error);
        }
    }

    async generateSmartItinerary(req, res, next) {
        try {
            const { destination, days } = req.body;
            const itinerary = await this.itineraryService.generateSmartItinerary(destination, days);
            res.status(200).json(itinerary)
        } catch (error) {
            next(error)
        }
    }
}