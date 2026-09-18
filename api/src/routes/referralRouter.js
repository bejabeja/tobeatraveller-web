import { Router } from "express";
import { ReferralController } from "../controllers/referralController.js";
import { requireRole } from "../middlewares/requireRole.js";
import { ReferralRepository } from "../repositories/referralRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { ReferralService } from "../services/referralService.js";
import { STAFF_ROLES } from "../utils/roles.js";

export const createReferralRouter = () => {
    const router = Router();

    const referralRepository = new ReferralRepository();
    const userRepository = new UserRepository();
    const referralService = new ReferralService(referralRepository, userRepository, auditLogService);
    const referralController = new ReferralController(referralService);
    const staffOnly = requireRole(...STAFF_ROLES);

    router.get("/me", referralController.getMyReferralInfo.bind(referralController));
    router.get("/admin/overview", staffOnly, referralController.getAdminOverview.bind(referralController));

    return router;
};
