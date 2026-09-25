import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { assertItineraryOwner, assertItineraryVisible } from "../utils/itineraryAccess.js";
import { AUDIT_EVENTS } from "../utils/auditEvents.js";

// Each generation call costs real money (Groq). Not a real bill risk at
// current usage (well under a cent each), but with no other cap on this
// route a single compromised account could otherwise generate indefinitely;
// this is a generous ceiling no genuine trip-planning user would hit, even
// while iterating on a trip (regenerating with different dates/budget/pace).
const MONTHLY_AI_GENERATION_LIMIT = 50;

export class ItineraryService {
    constructor(
        itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService,
        auditLogService = null, referralService = null, badgeService = null
    ) {
        this.itinerariesRepository = itinerariesRepository;
        this.placesRepository = placesRepository;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
        this.aiService = aiService;
        this.auditLogService = auditLogService;
        this.referralService = referralService;
        this.badgeService = badgeService;
    }

    // Fire-and-forget, same pattern as CommentsService -> NotificationsService:
    // a referral reward is a side effect that must never break itinerary
    // creation. Only fires on someone's very first itinerary (whichever way
    // it was created), which is the "did they actually engage" signal a
    // referral reward should be gated on, not just signing up.
    async _rewardIfFirstItinerary(userId, itineraryId) {
        if (!this.referralService) return;

        const total = await this.itinerariesRepository.getTotalByUserId(userId);
        if (total === 1) {
            this.referralService.rewardFirstItinerary(userId, itineraryId).catch(() => {});
        }
    }
    async getItineraryById(id, requestingUserId) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }
        assertItineraryVisible(itinerary, requestingUserId);
        const places = await this.placesRepository.getPlacesByItineraryId(itinerary.id);
        for (const place of places) {
            itinerary.addPlace(place);
        }
        const images = await this.itinerariesRepository.getImagesByItineraryId(itinerary.id);
        for (const image of images) {
            itinerary.addImage(image);
        }

        return itinerary.toDTO();
    }

    async createItinerary(data, file, images, userId) {
        let imageUrl = "";
        let imagePublicId = "";

        if (file) {
            const result = await this.cloudinaryService.uploadImageFromBuffer(file.buffer);
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        }

        const itineraryData = {
            ...data,
            userId,
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
            await this.itinerariesRepository.linkPlace(itinerary.id, place.id, placeData.orderIndex, placeData.dayNumber ?? 1, placeData.description ?? null);
            itinerary.addPlace(place);
        }

        await this._addGalleryImages(itinerary, images ?? []);
        await this._rewardIfFirstItinerary(userId, itinerary.id);
        this.badgeService?.evaluateUserInBackground(userId);

        return itinerary.toDTO();
    }

    async _addGalleryImages(itinerary, files, startIndex = 0) {
        for (let i = 0; i < files.length; i++) {
            const result = await this.cloudinaryService.uploadImageFromBuffer(files[i].buffer);
            const image = await this.itinerariesRepository.linkImage(itinerary.id, result.secure_url, result.public_id, startIndex + i);
            itinerary.addImage(image);
        }
    }

    async cloneItinerary(sourceId, userId) {
        const source = await this.itinerariesRepository.findById(sourceId);
        if (!source) {
            throw new NotFoundError("Itinerary not found");
        }
        assertItineraryVisible(source, userId);

        const places = await this.placesRepository.getPlacesByItineraryId(source.id);

        const itinerary = await this.itinerariesRepository.create({
            userId,
            title: source.title,
            description: source.description,
            location: source.location,
            startDate: source.startDate,
            endDate: source.endDate,
            numberOfPeople: source.numberOfPeople,
            category: source.category,
            budget: source.budget,
            currency: source.currency,
            photoUrl: source.photoUrl,
            photoPublicId: null,
            isPublic: false,
            source: source.source,
        });
        if (!itinerary) {
            throw new ConflictError("It was not possible to clone the itinerary");
        }

        // Each place's insert+link pair must stay sequential (linkPlace needs the id
        // insertPlace returns), but different places don't depend on each other, so
        // run them concurrently instead of one full round trip at a time.
        const newPlaces = await Promise.all(places.map(async (place) => {
            const placeData = {
                infoPlace: { name: place.name, label: place.label, lat: place.latitude, lon: place.longitude },
                category: place.category,
                orderIndex: place.orderIndex,
                dayNumber: place.dayNumber,
                description: place.description,
            };
            const newPlace = await this.placesRepository.insertPlace(placeData);
            await this.itinerariesRepository.linkPlace(itinerary.id, newPlace.id, placeData.orderIndex, placeData.dayNumber, placeData.description);
            return newPlace;
        }));
        newPlaces.forEach(newPlace => itinerary.addPlace(newPlace));
        await this._rewardIfFirstItinerary(userId, itinerary.id);

        return itinerary.toDTO();
    }

    async deleteItinerary(id, userId) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }
        assertItineraryOwner(itinerary, userId);

        if (itinerary.photoPublicId) {
            await this.cloudinaryService.deleteImage(itinerary.photoPublicId);
        }

        const galleryImages = await this.itinerariesRepository.getImagesByItineraryId(id);
        for (const image of galleryImages) {
            if (image.photoPublicId) {
                await this.cloudinaryService.deleteImage(image.photoPublicId);
            }
        }

        await this.itinerariesRepository.delete(id);
    }

    async updateItinerary(id, itineraryData, file, images, userId) {
        const itinerary = await this.itinerariesRepository.findById(id);
        if (!itinerary) {
            throw new NotFoundError("Itinerary not found");
        }
        assertItineraryOwner(itinerary, userId);

        if (file) {
            if (itinerary.photoPublicId) {
                await this.cloudinaryService.deleteImage(itinerary.photoPublicId);
            }
            const result = await this.cloudinaryService.uploadImageFromBuffer(file.buffer);
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
                await this.itinerariesRepository.updatePlaceOrder(itinerary.id, { ...placeData, description: placeData.description ?? null });
            } else {
                const newPlace = await this.placesRepository.insertPlace(placeData);
                await this.itinerariesRepository.linkPlace(itinerary.id, newPlace.id, placeData.orderIndex, placeData.dayNumber ?? 1, placeData.description ?? null);
            }
        }

        const currentImages = await this.itinerariesRepository.getImagesByItineraryId(itinerary.id);
        // A caller that doesn't send keepImageIds at all (e.g. EditExperience, which
        // never touches the gallery) means "leave the gallery as is", not "delete
        // everything" - only an explicit array (including an empty one) is a real diff.
        let nextOrderIndex = currentImages.reduce((max, image) => Math.max(max, image.orderIndex ?? 0), -1) + 1;

        if (itineraryData.keepImageIds !== undefined) {
            const keepImageIds = new Set(itineraryData.keepImageIds);
            const keptImages = [];

            for (const image of currentImages) {
                if (keepImageIds.has(image.id)) {
                    keptImages.push(image);
                } else {
                    if (image.photoPublicId) {
                        await this.cloudinaryService.deleteImage(image.photoPublicId);
                    }
                    await this.itinerariesRepository.unlinkImage(itinerary.id, image.id);
                }
            }

            nextOrderIndex = keptImages.reduce((max, image) => Math.max(max, image.orderIndex ?? 0), -1) + 1;
        }

        await this._addGalleryImages(itinerary, images ?? [], nextOrderIndex);

        await this.itinerariesRepository.update(id, itineraryData);
        // Making a trip public, or moving it to another country, can earn a badge.
        this.badgeService?.evaluateUserInBackground(userId);
    }

    async generateSmartItinerary(destination, totalDays, context = {}, actingUser = null) {
        if (actingUser && this.auditLogService) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { total } = await this.auditLogService.getFiltered({
                actorId: actingUser.id,
                action: AUDIT_EVENTS.AI_ITINERARY_GENERATED,
                dateFrom: startOfMonth.toISOString(),
                limit: 1,
            });
            if (total >= MONTHLY_AI_GENERATION_LIMIT) {
                throw new TooManyRequestsError(
                    `Monthly AI itinerary limit reached (${MONTHLY_AI_GENERATION_LIMIT}/month). It resets at the start of next month.`
                );
            }
        }

        const rawText = await this.aiService.generateTextPrompt(destination, totalDays, context)
        let itinerary;
        try {
            itinerary = JSON.parse(rawText)
        } catch {
            throw new Error(`AI returned invalid JSON for destination "${destination}"`)
        }

        if (actingUser) {
            this.auditLogService?.log({
                actorId: actingUser.id, actorUsername: actingUser.username,
                action: AUDIT_EVENTS.AI_ITINERARY_GENERATED,
                metadata: { destination, totalDays },
            });
        }

        return itinerary;
    }
}