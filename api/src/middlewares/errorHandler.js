import * as Sentry from "@sentry/node";
import multer from "multer";
import { BaseError } from "../errors/BaseError.js";
import { logger } from "../utils/logger.js";

const PAYLOAD_TOO_LARGE = 413;
const BAD_REQUEST = 400;

// What goes wrong reading the request (its JSON, its file) before any code of ours runs: the
// request is what was wrong, not the server. Sizes a person can run into get the keys the apps
// show in their language; the rest only another program can trip, and it says what it is.
const requestError = (err) => {
    if (err instanceof multer.MulterError) {
        return err.code === "LIMIT_FILE_SIZE"
            ? { status: PAYLOAD_TOO_LARGE, message: "validation.imageTooLarge" }
            : { status: BAD_REQUEST, message: err.message };
    }
    if (err.type === "entity.too.large") return { status: PAYLOAD_TOO_LARGE, message: "validation.tooLong" };
    if (err.type === "entity.parse.failed") return { status: BAD_REQUEST, message: "Invalid JSON body" };
    // express.json() marks with `expose` the errors whose message is safe to send.
    if (err.expose && err.status >= BAD_REQUEST && err.status < 500) return { status: err.status, message: err.message };
    return null;
};

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const fromRequest = requestError(err);
    if (fromRequest) {
        Sentry.captureException(err);
        return res.status(fromRequest.status).json({ error: fromRequest.message });
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
