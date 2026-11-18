import * as Sentry from "@sentry/node";
import { BaseError } from "../errors/BaseError.js";
import { logger } from "../utils/logger.js";
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const status = err instanceof BaseError ? err.statusCode : 500;
    if (status >= 500) logger.error('[ERROR]', err);
    Sentry.captureException(err);
    // An unexpected error's own message is about the inside (a database error, a stack
    // detail), not for whoever made the request: it is logged and reported above, and the
    // apps show their own message, in the person's language, when the answer brings none.
    if (!(err instanceof BaseError)) {
        return res.status(status).json({});
    }
    res.status(status).json({
        error: err.message,
        ...(err.field && { field: err.field }),
    });
}
