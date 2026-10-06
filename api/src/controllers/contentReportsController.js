import { reportDecisionSchema, reportSchema } from "../utils/schemasValidation.js";
import { REPORT_STATUSES } from "../utils/contentReports.js";
import { ValidationError } from "../errors/ValidationError.js";

const DEFAULT_REPORTS_PAGE_SIZE = 20;
const MAX_REPORTS_PAGE_SIZE = 100;

export class ContentReportsController {
    constructor(contentReportsService) {
        this.contentReportsService = contentReportsService;
    }

    async submitReport(req, res, next) {
        const result = reportSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid report", result.error.errors[0]?.path?.[0]));
        }
        try {
            const report = await this.contentReportsService.submitReport(req.user, result.data);
            return res.status(201).json({ message: "Report received", report });
        } catch (error) {
            next(error);
        }
    }

    async listReports(req, res, next) {
        try {
            const status = Object.values(REPORT_STATUSES).includes(req.query.status) ? req.query.status : undefined;
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_REPORTS_PAGE_SIZE, 1), MAX_REPORTS_PAGE_SIZE);
            const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
            const page = await this.contentReportsService.listReports({ status, limit, offset });
            return res.status(200).json(page);
        } catch (error) {
            next(error);
        }
    }

    async decideReport(req, res, next) {
        const result = reportDecisionSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Invalid decision"));
        }
        try {
            await this.contentReportsService.decideReport(req.params.reportId, req.user, result.data);
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    }
}
