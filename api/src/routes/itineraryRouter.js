import { Router } from "express";
import { ItineraryController } from "../controllers/itineraryController.js";
import { upload } from "../middlewares/uploadImage.js";
import { PlacesRepository } from "../repositories/placesRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AIService } from "../services/AIService.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { ItineraryService } from "../services/itineraryService.js";

export const createItineraryRouter = () => {
    const itinerariesRouter = Router();

    const itinerariesRepository = new ItineraryRepository();
    const placesRepository = new PlacesRepository();
    const userRepository = new UserRepository();
    const cloudinaryService = new CloudinaryService();
    const aiService = new AIService();
    const itinerariesService = new ItineraryService(itinerariesRepository, placesRepository, userRepository, cloudinaryService, aiService);
    const itinerariesController = new ItineraryController(itinerariesService)

    itinerariesRouter.post("/", upload.single("file"), itinerariesController.createItinerary.bind(itinerariesController));
    itinerariesRouter.post("/generate-smart", itinerariesController.generateSmartItinerary.bind(itinerariesController));

    itinerariesRouter.patch("/edit/:id", upload.single("file"), itinerariesController.updateItinerary.bind(itinerariesController));
    itinerariesRouter.delete("/:id", itinerariesController.deleteItinerary.bind(itinerariesController));
    itinerariesRouter.get("/:id", itinerariesController.getItineraryById.bind(itinerariesController));

    return itinerariesRouter;
}