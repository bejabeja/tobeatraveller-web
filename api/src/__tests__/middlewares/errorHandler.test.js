import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { errorHandler } from '../../middlewares/errorHandler.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
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
});
