import { Router } from "express";
import { BlocksController } from "../controllers/blocksController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { BlocksRepository } from "../repositories/blocksRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { BlocksService } from "../services/blocksService.js";

export const createBlocksRouter = () => {
    const router = Router();

    const blocksController = new BlocksController(new BlocksService(new BlocksRepository(), new UserRepository()));

    router.get("/:userId", authenticate, blocksController.getStatus.bind(blocksController));
    router.post("/:userId", authenticate, blocksController.block.bind(blocksController));
    router.delete("/:userId", authenticate, blocksController.unblock.bind(blocksController));

    return router;
};
