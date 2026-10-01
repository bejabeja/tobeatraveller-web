import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../errors/TooManyRequestsError.js";
import { RATE_LIMIT_BEHIND_VERCEL } from "./rateLimitOptions.js";

// Exact text: the apps match it to show it in the person's language
// (shared/src/utils/authErrorMessages.js).
export const TOO_MANY_AUTH_ATTEMPTS_MESSAGE = "Too many attempts, please try again later.";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_FAILED_LOGINS_PER_ACCOUNT = 10;
const MAX_FAILED_LOGINS_PER_IP = 30;
const MAX_PASSWORD_RESET_EMAILS_PER_ACCOUNT_PER_HOUR = 3;
const MAX_PASSWORD_RESET_EMAILS_PER_IP_PER_HOUR = 10;
const MAX_SIGNUPS_PER_IP_PER_HOUR = 10;

const tooManyAttempts = (req, res, next) => next(new TooManyRequestsError(TOO_MANY_AUTH_ATTEMPTS_MESSAGE));

const normalizedEmail = (req) => (typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "");
const hasNoEmail = (req) => normalizedEmail(req) === "";

const baseOptions = {
    ...RATE_LIMIT_BEHIND_VERCEL,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyAttempts,
};

// Sign-in: only the attempts that fail count, so using the app never runs
// the allowance down. Keyed by the account as well as the network, since
// guessing one password from many addresses is what these stop. Answered the
// same for an email that has no account, so it reveals nothing about who has one.
export const failedLoginPerAccountRateLimit = rateLimit({
    ...baseOptions,
    windowMs: FIFTEEN_MINUTES_MS,
    limit: MAX_FAILED_LOGINS_PER_ACCOUNT,
    keyGenerator: normalizedEmail,
    skip: hasNoEmail,
    skipSuccessfulRequests: true,
});

export const failedLoginPerIpRateLimit = rateLimit({
    ...baseOptions,
    windowMs: FIFTEEN_MINUTES_MS,
    limit: MAX_FAILED_LOGINS_PER_IP,
    skipSuccessfulRequests: true,
});

// "Forgot your password" sends an email to whatever address it is given, so
// it is bounded like the contact form: by the address that receives it and by
// the network. It answers 200 for any email, so these count it all.
export const passwordResetPerAccountRateLimit = rateLimit({
    ...baseOptions,
    windowMs: ONE_HOUR_MS,
    limit: MAX_PASSWORD_RESET_EMAILS_PER_ACCOUNT_PER_HOUR,
    keyGenerator: normalizedEmail,
    skip: hasNoEmail,
    skipFailedRequests: true,
});

export const passwordResetPerIpRateLimit = rateLimit({
    ...baseOptions,
    windowMs: ONE_HOUR_MS,
    limit: MAX_PASSWORD_RESET_EMAILS_PER_IP_PER_HOUR,
    skipFailedRequests: true,
});

// Each signup sends a welcome email and can be farmed for invite rewards.
// Rejected signups (a taken name, a bad email) do not count.
export const signupPerIpRateLimit = rateLimit({
    ...baseOptions,
    windowMs: ONE_HOUR_MS,
    limit: MAX_SIGNUPS_PER_IP_PER_HOUR,
    skipFailedRequests: true,
});
