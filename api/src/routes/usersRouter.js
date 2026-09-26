import { Router } from "express";
import { BadgeController } from "../controllers/badgeController.js";
import { UserController } from "../controllers/userController.js";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { upload } from "../middlewares/uploadImage.js";
import { STAFF_ROLES } from "../utils/roles.js";
import { BadgeRepository } from "../repositories/badgeRepository.js";
import { FollowRepository } from "../repositories/followRepository.js";
import { InventoryRepository } from "../repositories/inventoryRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { NotificationsRepository } from "../repositories/notificationsRepository.js";
import { LifeDiaryRepository } from "../repositories/lifeDiaryRepository.js";
import { PackingChecklistRepository } from "../repositories/packingChecklistRepository.js";
import { ShoppingListRepository } from "../repositories/shoppingListRepository.js";
import { SubscriptionRepository } from "../repositories/subscriptionRepository.js";
import { PushTokensRepository } from "../repositories/pushTokensRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { VanLogRepository } from "../repositories/vanLogRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { BadgeService } from "../services/badgeService.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { EmailService } from "../services/emailService.js";
import { NotificationsService } from "../services/notificationsService.js";
import { PushNotificationsService } from "../services/pushNotificationsService.js";
import { UserService } from "../services/userService.js";

export const createUsersRouter = () => {
    const router = Router();
    const itinerariesRepository = new ItineraryRepository();
    const userRepository = new UserRepository();
    const followRepository = new FollowRepository()
    const lifeDiaryRepository = new LifeDiaryRepository();
    const vanLogRepository = new VanLogRepository();
    const inventoryRepository = new InventoryRepository();
    const shoppingListRepository = new ShoppingListRepository();
    const packingChecklistRepository = new PackingChecklistRepository();
    const subscriptionRepository = new SubscriptionRepository();
    const emailService = new EmailService();
    const badgeRepository = new BadgeRepository();
    const pushTokensRepository = new PushTokensRepository();
    // Opening one's own passport can save a badge or country before the
    // evaluation an action started, and then it's this router that announces it.
    const pushNotificationsService = new PushNotificationsService(pushTokensRepository, userRepository, itinerariesRepository);
    const notificationsService = new NotificationsService(new NotificationsRepository(), pushNotificationsService);
    const badgeController = new BadgeController(new BadgeService(badgeRepository, notificationsService, userRepository));
    const userService = new UserService(
        userRepository, itinerariesRepository, followRepository, emailService,
        lifeDiaryRepository, auditLogService, vanLogRepository,
        inventoryRepository, shoppingListRepository, packingChecklistRepository,
        subscriptionRepository, null, pushTokensRepository, badgeRepository
    );
    const cloudinaryService = new CloudinaryService();
    const userController = new UserController(userService, cloudinaryService);
    const staffOnly = requireRole(...STAFF_ROLES);

    router.get("/", authenticate, userController.getAllUsers.bind(userController));
    router.get("/me", authenticate, userController.getUserMe.bind(userController));
    router.get("/me/export", authenticate, userController.exportMyData.bind(userController));
    router.put("/me", authenticate, upload.single("avatar"), userController.updateUserMe.bind(userController));
    router.patch("/me/password", authenticate, userController.changePassword.bind(userController));
    router.patch("/me/language", authenticate, userController.updateMyLanguage.bind(userController));
    router.put("/me/declared-countries", authenticate, badgeController.updateMyDeclaredCountries.bind(badgeController));
    router.get("/me/passport/leaderboard", authenticate, badgeController.getMyLeaderboard.bind(badgeController));
    router.delete("/me", authenticate, userController.deleteUserMe.bind(userController));
    router.delete("/:id", authenticate, staffOnly, userController.deleteUserById.bind(userController));
    router.get("/featured", userController.getFeaturedUsers.bind(userController));
    router.get("/all", userController.getAllUsersFiltered.bind(userController));
    router.get("/admin", authenticate, staffOnly, userController.getAllUsersForAdmin.bind(userController));
    router.get("/suggested", authenticate, userController.getSuggestedUsers.bind(userController));
    router.get("/check-username", userController.checkUsernameAvailable.bind(userController));
    router.patch("/:id/role", authenticate, staffOnly, userController.updateUserRole.bind(userController));
    router.patch("/:id/tier", authenticate, staffOnly, userController.updateUserTier.bind(userController));
    router.get("/:id/passport", optionalAuthenticate, badgeController.getUserPassport.bind(badgeController));
    router.get("/:id", optionalAuthenticate, userController.getUserById.bind(userController));

    return router;
};
