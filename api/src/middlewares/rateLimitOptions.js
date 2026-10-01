// The API runs on Vercel, which overwrites X-Forwarded-For with the real address
// of the client and drops any the client sent, so the `trust proxy` setting in
// index.js cannot be used to fake an IP. express-rate-limit warns about that
// setting whatever the host, and logs an error on the first request of every
// limiter, so the check is switched off here, in one place. If the API ever
// moves to a host that does not do this, this is what has to be revisited.
export const RATE_LIMIT_BEHIND_VERCEL = { validate: { trustProxy: false } };
