import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { RATE_LIMIT_BEHIND_VERCEL } from "./rateLimitOptions.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_REPORTS_PER_USER_PER_HOUR = 10;

// Keyed by the person (the route is behind authenticate), so a flood of reports
// against someone cannot be sent from one account. Only reports that get
// through count: a rejected one must not use up the allowance.
export const perUserReportRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: ONE_HOUR_MS,
    limit: MAX_REPORTS_PER_USER_PER_HOUR,
    keyGenerator: (req) => req.user.id,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => next(new TooManyRequestsError("Too many reports, please try again later.")),
});
