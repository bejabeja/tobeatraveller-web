import { Router } from "express";
import { ContentReportsController } from "../controllers/contentReportsController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { perUserReportRateLimit } from "../middlewares/reportRateLimit.js";
import { requireRole } from "../middlewares/requireRole.js";
import { CommentsRepository } from "../repositories/commentsRepository.js";
import { ContentReportsRepository } from "../repositories/contentReportsRepository.js";
import { ItineraryRepository } from "../repositories/itineraryRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { auditLogService } from "../services/sharedAuditLogService.js";
import { ContentReportsService } from "../services/contentReportsService.js";
import { STAFF_ROLES } from "../utils/roles.js";

export const createContentReportsRouter = () => {
    const router = Router();

    const contentReportsService = new ContentReportsService(
        new ContentReportsRepository(),
        new CommentsRepository(),
        new ItineraryRepository(),
        new UserRepository(),
        auditLogService,
    );
    const contentReportsController = new ContentReportsController(contentReportsService);

    const staffOnly = requireRole(...STAFF_ROLES);

    router.post("/", authenticate, perUserReportRateLimit, contentReportsController.submitReport.bind(contentReportsController));
    router.get("/", authenticate, staffOnly, contentReportsController.listReports.bind(contentReportsController));
    router.patch("/:reportId", authenticate, staffOnly, contentReportsController.decideReport.bind(contentReportsController));

    return router;
};
