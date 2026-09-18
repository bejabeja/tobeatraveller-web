import { Router } from "express";
import { ItinerariesController } from "../controllers/itinerariesController.js";
import { ItineraryController } from "../controllers/itineraryController.js";
import { upload } from "../middlewares/uploadImage.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { globalAiRateLimit, perUserAiRateLimit } from "../middlewares/aiGenerationRateLimit.js";
import { requirePremium } from "../middlewares/requirePremium.js";
import { PlacesRepository } from "../repositories/placesRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { ReferralRepository } from "../repositories/referralRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AIService } from "../services/AIService.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { EmailService } from "../services/emailService.js";
import { ItineraryService } from "../services/itineraryService.js";
import { ItinerariesService } from "../services/itinerariesService.js";
import { NotificationsService } from "../services/notificationsService.js";
import { ReferralService } from "../services/referralService.js";

export const createItinerariesRouter = () => {
    const router = Router();

    const itinerariesRepository = new ItineraryRepository();
    const placesRepository = new PlacesRepository();
    const userRepository = new UserRepository();
    const referralRepository = new ReferralRepository();
    const notificationsRepository = new NotificationsRepository();
    const cloudinaryService = new CloudinaryService();
    const aiService = new AIService();
    const emailService = new EmailService();
    const notificationsService = new NotificationsService(notificationsRepository);
    const referralService = new ReferralService(referralRepository, userRepository, auditLogService, notificationsService, emailService);

    const itineraryService = new ItineraryService(itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService, auditLogService, referralService);
    const itinerariesService = new ItinerariesService(itinerariesRepository, userRepository, placesRepository);

    const itineraryController = new ItineraryController(itineraryService);
    const itinerariesController = new ItinerariesController(itinerariesService);

    // ── Listing & filtering (specific routes must come before /:id) ───────────
    router.get("/stats",        itinerariesController.getStats.bind(itinerariesController));
    router.get("/destinations", itinerariesController.getDestinations.bind(itinerariesController));
    router.get("/featured",     itinerariesController.featuredItineraries.bind(itinerariesController));
    router.get("/feed",         authenticate, itinerariesController.getFeed.bind(itinerariesController));
    router.get("/mine",         authenticate, itinerariesController.getMyItineraries.bind(itinerariesController));
    router.get("/user/:id",     itinerariesController.getItinerariesByUserId.bind(itinerariesController));
    router.get("/",             itinerariesController.filterItinerariesBy.bind(itinerariesController));

    // ── Single itinerary CRUD ─────────────────────────────────────────────────
    router.get("/:id",          optionalAuthenticate, itineraryController.getItineraryById.bind(itineraryController));
    router.post("/",            authenticate, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 6 }]), itineraryController.createItinerary.bind(itineraryController));
    router.post("/generate-smart", authenticate, requirePremium(userRepository), globalAiRateLimit, perUserAiRateLimit, itineraryController.generateSmartItinerary.bind(itineraryController));
    router.patch("/:id",        authenticate, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 6 }]), itineraryController.updateItinerary.bind(itineraryController));
    router.delete("/:id",       authenticate, itineraryController.deleteItinerary.bind(itineraryController));
    router.post("/:id/clone",   authenticate, itineraryController.cloneItinerary.bind(itineraryController));

    return router;
}
