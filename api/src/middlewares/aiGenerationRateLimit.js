import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { RATE_LIMIT_BEHIND_VERCEL } from "./rateLimitOptions.js";

const rateLimitHandler = (message) => (req, res, next) => next(new TooManyRequestsError(message));

// Per-user burst guard: stops a single compromised or scripted account from
// hammering the (Groq-billed) AI endpoint, independent of the monthly quota
// enforced in itineraryService.js.
export const perUserAiRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: 60 * 1000,
    limit: 5,
    keyGenerator: (req) => req.user?.id,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Too many itinerary generations, please slow down and try again in a minute."),
});

// Global backstop, independent of the per-user limit above: caps total AI
// usage across every account at once, so many accounts being abused at the
// same time (e.g. credential stuffing) can't blow past Groq's own shared
// rate limits.
export const globalAiRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("The AI itinerary generator is busy right now, please try again in a minute."),
});
