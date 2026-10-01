import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { RATE_LIMIT_BEHIND_VERCEL } from "./rateLimitOptions.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_RESENDS_PER_USER_PER_HOUR = 3;
const MAX_RESENDS_PER_IP_PER_HOUR = 10;

const tooManyResends = (req, res, next) => next(
    new TooManyRequestsError("Too many confirmation emails, please try again later."),
);

// Asking for the link again sends an email, so it is bounded. Only the sends
// that go through count, so a failure on our side never locks anyone out.
export const perIpResendVerificationRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: ONE_HOUR_MS,
    limit: MAX_RESENDS_PER_IP_PER_HOUR,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyResends,
});

// Runs after authenticate: keyed by the account, whatever the network.
export const perUserResendVerificationRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: ONE_HOUR_MS,
    limit: MAX_RESENDS_PER_USER_PER_HOUR,
    keyGenerator: (req) => req.user.id,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyResends,
});
