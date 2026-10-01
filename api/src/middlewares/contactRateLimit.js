import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { RATE_LIMIT_BEHIND_VERCEL } from "./rateLimitOptions.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_CONTACTS_PER_IP_PER_HOUR = 5;
const MAX_CONTACTS_PER_EMAIL_PER_HOUR = 3;

const tooManyContacts = (req, res, next) => next(
    new TooManyRequestsError("Too many contact messages, please try again later."),
);

const normalizedEmail = (req) => (typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "");

// The endpoint is public and emails whatever address the form carries, so
// without these anyone could use it to mail a third party in a loop. Only the
// requests that go through count: a rejected or failed one sends no email, and
// must not leave a person who just needs to retry locked out for an hour.
export const perIpContactRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: ONE_HOUR_MS,
    limit: MAX_CONTACTS_PER_IP_PER_HOUR,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyContacts,
});

// Keyed by the address that receives the confirmation, so a victim is
// protected even when the requests come from many IPs.
export const perEmailContactRateLimit = rateLimit({
    ...RATE_LIMIT_BEHIND_VERCEL,
    windowMs: ONE_HOUR_MS,
    limit: MAX_CONTACTS_PER_EMAIL_PER_HOUR,
    keyGenerator: normalizedEmail,
    skip: (req) => normalizedEmail(req) === "",
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyContacts,
});
