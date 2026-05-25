import * as Sentry from "@sentry/node";
import { BaseError } from "../errors/BaseError.js";
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const status = err instanceof BaseError ? err.statusCode : 500;
    if (status >= 500) console.error('[ERROR]', err);
    Sentry.captureException(err);
    res.status(status).json({
        error: err.message || "Internal server error",
    });
}
