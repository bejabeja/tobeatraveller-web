import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class ItineraryService {
    constructor(itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService) {
        this.itinerariesRepository = itinerariesRepository;
        this.placesRepository = placesRepository;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
        this.aiService = aiService;
    }
    async getItineraryById(id) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }
        const places = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
        for (const place of places) {
            itinerary.addPlace(place);
        }

        return itinerary.toDTO();
    }

    async createItinerary(data, file) {
        let imageUrl = "";
        let imagePublicId = "";

        if (file) {
            const result = await this.cloudinaryService.uploadImageFromBuffer(file.buffer, file.originalname);
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        }

        const itineraryData = {
            ...data,
            photoUrl: imageUrl,
            photoPublicId: imagePublicId,
            isPublic: data.isPublic ?? true,
        };

        const itinerary = await this.itinerariesRepository.create(itineraryData);
        if (!itinerary) {
            throw new ConflictError("It was not possible to create the itinerary");
        }

        for (const placeData of itineraryData.places) {
            const place = await this.placesRepository.insertPlace(placeData);
            await this.itinerariesRepository.linkPlace(itinerary.id, place.id, placeData.orderIndex, placeData.dayNumber ?? 1);
            itinerary.addPlace(place);
        }
        return itinerary.toDTO();
    }

    async deleteItinerary(id) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }

        if (itinerary.photoPublicId) {
            await this.cloudinaryService.deleteImage(itinerary.photoPublicId);
        }

        await this.itinerariesRepository.delete(id);
    }

    async updateItinerary(id, itineraryData, file) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }

        if (file) {
            if (itinerary.photoPublicId) {
                await this.cloudinaryService.deleteImage(itinerary.photoPublicId);
            }
            const result = await this.cloudinaryService.uploadImageFromBuffer(file.buffer, file.originalname);
            itineraryData.photoUrl = result.secure_url;
            itineraryData.photoPublicId = result.public_id;
        } else {
            itineraryData.photoUrl = itinerary.photoUrl;
            itineraryData.photoPublicId = itinerary.photoPublicId;
        }

        const currentPlaces = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
        const currentPlaceIds = new Set(currentPlaces.map(p => p.id));

        const incomingPlaces = itineraryData.places || [];
        const incomingPlaceIds = new Set(incomingPlaces.map(p => p.id));

        for (const place of currentPlaces) {
            if (!incomingPlaceIds.has(place.id)) {
                await this.itinerariesRepository.unlinkPlace(itinerary.id, place.id);
            }
        }

        for (const placeData of incomingPlaces) {
            if (currentPlaceIds.has(placeData.id)) {
                await this.placesRepository.updatePlace(placeData);
                await this.itinerariesRepository.updatePlaceOrder(itinerary.id, placeData);
            } else {
                const newPlace = await this.placesRepository.insertPlace(placeData);
                await this.itinerariesRepository.linkPlace(itinerary.id, newPlace.id, placeData.orderIndex, placeData.dayNumber ?? 1);
            }
        }

        await this.itinerariesRepository.update(id, itineraryData);
    }

    async generateSmartItinerary(destination, totalDays) {
        const rawText = await this.aiService.generateTextPrompt(destination, totalDays)
        try {
            return JSON.parse(rawText)
        } catch {
            throw new Error(`AI returned invalid JSON for destination "${destination}"`)
        }
    }
}