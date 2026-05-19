import { Router } from "express";
import { ItinerariesController } from "../controllers/itinerariesController.js";
import { PlacesRepository } from "../repositories/placesRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { ItinerariesService } from "../services/itinerariesService.js";

export const createItinerariesRouter = () => {
    const router = Router();

    const itinerariesRepository = new ItineraryRepository();
    const userRepository = new UserRepository();
    const placesRepository = new PlacesRepository();

    const itinerariesService = new ItinerariesService(itinerariesRepository, userRepository, placesRepository);
    const itinerariesController = new ItinerariesController(itinerariesService)

    router.get("/", itinerariesController.filterItinerariesBy.bind(itinerariesController));
    router.get("/featured", itinerariesController.featuredItineraries.bind(itinerariesController));
    router.get("/:id", itinerariesController.getItinerariesByUserId.bind(itinerariesController));

    return router;
}