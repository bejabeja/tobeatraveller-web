import { Router } from "express";
import { LifeDiaryController } from "../controllers/lifeDiaryController.js";
import { upload } from "../middlewares/uploadImage.js";
import { LifeDiaryRepository } from "../repositories/lifeDiaryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { LifeDiaryService } from "../services/lifeDiaryService.js";

export const createLifeDiaryRouter = () => {
    const router = Router();

    const lifeDiaryRepository = new LifeDiaryRepository();
    const userRepository = new UserRepository();
    const cloudinaryService = new CloudinaryService();
    const lifeDiaryService = new LifeDiaryService(lifeDiaryRepository, cloudinaryService, userRepository);
    const lifeDiaryController = new LifeDiaryController(lifeDiaryService);

    const uploadImages = upload.fields([{ name: 'images', maxCount: 6 }]);

    router.get('/usage', lifeDiaryController.getFreeTierUsage.bind(lifeDiaryController));
    router.get('/', lifeDiaryController.getMyEntries.bind(lifeDiaryController));
    router.post('/', uploadImages, lifeDiaryController.createEntry.bind(lifeDiaryController));
    router.patch('/:id', uploadImages, lifeDiaryController.updateEntry.bind(lifeDiaryController));
    router.delete('/:id', lifeDiaryController.deleteEntry.bind(lifeDiaryController));

    return router;
};
