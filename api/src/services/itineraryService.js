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
        };

        const itinerary = await this.itinerariesRepository.create(itineraryData);
        if (!itinerary) {
            throw new ConflictError("It was not possible to create the itinerary");
        }

        for (const placeData of itineraryData.places) {
            let place = await this.placesRepository.findByPlaceAttributes(
                placeData.infoPlace.lat,
                placeData.infoPlace.lon,
                placeData.orderIndex
            );
            if (!place) {
                place = await this.placesRepository.insertPlace(placeData);
            }
            await this.itinerariesRepository.linkPlace(itinerary.id, place.id, placeData.orderIndex);
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

    /**
     * Updates an existing itinerary with new data and optionally a new image.
     * 
     * This method performs the following:
     * 1. Validates the existence of the itinerary.
     * 2. Handles optional image replacement via Cloudinary.
     * 3. Reconciles the list of places:
     *    - Unlinks any places that are no longer associated.
     *    - Updates existing places.
     *    - Inserts and links new places.
     * 4. Updates the itinerary metadata in the database.
     * 
     * @param {string} id - The ID of the itinerary to update.
     * @param {object} itineraryData - The updated data for the itinerary, including metadata and places.
     * @param {object} [file] - An optional image file to be uploaded.
     * 
     * @throws {NotFoundError} If the itinerary does not exist.
     */
    async updateItinerary(id, itineraryData, file) {
        // Retrieve the itinerary; if it doesn't exist, throw an error
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }

        // If a new image is provided, upload it to Cloudinary and store its details
        if (file) {
            const result = await this.cloudinaryService.uploadImageFromBuffer(file.buffer, file.originalname);
            itineraryData.photoUrl = result.secure_url;
            itineraryData.photoPublicId = result.public_id;
        } else {
            // Preserve the existing image if no new file is uploaded
            itineraryData.photoUrl = itinerary.photoUrl;
            itineraryData.photoPublicId = itinerary.photoPublicId;
        }

        // Fetch all places currently linked to this itinerary
        const currentPlaces = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
        const currentPlaceIds = new Set(currentPlaces.map(p => p.id));

        // Prepare the incoming place data from the update payload
        const incomingPlaces = itineraryData.places || [];
        const incomingPlaceIds = new Set(incomingPlaces.map(p => p.id));

        // Identify and remove places that were previously linked but are now missing
        for (const place of currentPlaces) {
            if (!incomingPlaceIds.has(place.id)) {
                await this.itinerariesRepository.unlinkPlace(itinerary.id, place.id);
            }
        }

        // Process incoming places: update existing ones and add new ones
        for (const placeData of incomingPlaces) {
            if (currentPlaceIds.has(placeData.id)) {
                // Update details and order of existing places
                await this.placesRepository.updatePlace(placeData);
                await this.itinerariesRepository.updatePlaceOrder(itinerary.id, placeData);
            } else {
                // Insert a new place and link it to the itinerary
                const newPlace = await this.placesRepository.insertPlace(placeData);
                await this.itinerariesRepository.linkPlace(itinerary.id, newPlace.id, placeData.orderIndex);
            }
        }

        // Finalize by updating the itinerary metadata itself
        await this.itinerariesRepository.update(id, itineraryData);
    }

    async generateSmartItinerary(destination, totalDays) {
        const rawText = await this.aiService.generateTextPrompt(destination, totalDays)
        const parsedItinerary = JSON.parse(rawText)

        return parsedItinerary
    }
}