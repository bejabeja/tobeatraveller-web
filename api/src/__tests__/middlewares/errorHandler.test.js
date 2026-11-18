import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { errorHandler } from '../../middlewares/errorHandler.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import multer from 'multer';
import { logger } from '../../utils/logger.js';

const handle = (error) => {
    const res = { headersSent: false, status: vi.fn(() => res), json: vi.fn(() => res) };
    errorHandler(error, {}, res, vi.fn());
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

describe('errorHandler', () => {
    it('answers an error of the app with its status, message and field', () => {
        expect(handle(new NotFoundError('Itinerary not found'))).toEqual({ status: 404, body: { error: 'Itinerary not found' } });
        expect(handle(new ValidationError('validation.tooLong', 'title')).body).toEqual({ error: 'validation.tooLong', field: 'title' });
    });

    // Regression: an unexpected error sent its own message, so a database error reached the
    // client word for word (and the apps showed it instead of their own message).
    it('keeps what went wrong inside out of the answer to an unexpected error, and logs it', () => {
        const databaseError = new Error('invalid input syntax for type integer: "NaN"');

        const { status, body } = handle(databaseError);

        expect(status).toBe(500);
        expect(JSON.stringify(body)).not.toContain('NaN');
        expect(body.error).toBeUndefined();
        expect(logger.error).toHaveBeenCalledWith('[ERROR]', databaseError);
    });

    // Regression: what was wrong with the request itself answered 500, as if the server had
    // failed, and a photo over the limit showed a generic error instead of saying so.
    describe('a request that could not be read', () => {
        const bodyParserError = (type, status, message) => Object.assign(new Error(message), { type, status, statusCode: status, expose: true });

        it('says a photo is over the size limit, in a way the apps translate', () => {
            expect(handle(new multer.MulterError('LIMIT_FILE_SIZE', 'avatar'))).toEqual({ status: 413, body: { error: 'validation.imageTooLarge' } });
        });

        it('turns down a file sent in a field that takes none', () => {
            expect(handle(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo')).status).toBe(400);
        });

        it('says JSON that does not parse is a bad request', () => {
            expect(handle(bodyParserError('entity.parse.failed', 400, 'Unexpected end of JSON input')))
                .toEqual({ status: 400, body: { error: 'Invalid JSON body' } });
        });

        it('says a body over the size limit is too long', () => {
            expect(handle(bodyParserError('entity.too.large', 413, 'request entity too large')))
                .toEqual({ status: 413, body: { error: 'validation.tooLong' } });
        });

        it('keeps any other request error the parser marks safe to show with its own status', () => {
            expect(handle(bodyParserError('encoding.unsupported', 415, 'unsupported content encoding "br"')))
                .toEqual({ status: 415, body: { error: 'unsupported content encoding "br"' } });
        });

        it('does not log them as failures of the server', () => {
            logger.error.mockClear();

            handle(bodyParserError('entity.parse.failed', 400, 'Unexpected token'));

            expect(logger.error).not.toHaveBeenCalled();
        });
    });
});
