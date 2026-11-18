import { describe, expect, it, vi } from 'vitest';
import { translateApiError, userFacingError } from '../../utils/apiErrorMessages.js';
import { parseError } from '../../utils/parseError.js';

const t = vi.fn((key) => `translated:${key}`);

const failedRequest = async (body, defaultMessage = 'Failed to save entry') => {
    const response = { status: body ? 400 : 500, json: async () => body ?? {} };
    return parseError(response, defaultMessage).catch((error) => error);
};

describe('translateApiError', () => {
    it('translates a known message of the API', () => {
        expect(translateApiError(t, 'Invalid credentials')).toBe('translated:auth.invalidCredentials');
    });

    it('passes through a message it does not know', () => {
        expect(translateApiError(t, 'Something the backend never said before')).toBe('Something the backend never said before');
    });

    it('gives the screen\'s own message for a message it does not know, when the screen has one', () => {
        expect(translateApiError(t, 'Failed to log in', 'screen message')).toBe('screen message');
        expect(translateApiError(t, undefined, 'screen message')).toBe('screen message');
    });

    it('translates a validation key', () => {
        expect(translateApiError(t, 'validation.required', 'screen message')).toBe('translated:validation.required');
    });

    it('translates the answer to too many attempts, which the API sends in English', () => {
        expect(translateApiError(t, 'Too many attempts, please try again later.')).toBe('translated:auth.tooManyAttempts');
    });
});

// Regression: the screens showed `error.message || their own message`, but a failed request
// always has a message: the API's English, or the request's own English when the API said
// nothing. So a failure on the server, or an "Only image files are allowed", came out in English.
describe('userFacingError', () => {
    it('says what the API said, in the person\'s language, when it is something they can act on', async () => {
        const error = await failedRequest({ error: 'Only image files are allowed' });

        expect(userFacingError(t, error, 'screen message')).toBe('translated:apiErrors.imagesOnly');
    });

    it('translates the validation keys the API sends', async () => {
        const error = await failedRequest({ error: 'validation.imageTooLarge' });

        expect(userFacingError(t, error, 'screen message')).toBe('translated:validation.imageTooLarge');
    });

    it('gives the screen\'s own message when the server failed and said nothing', async () => {
        const error = await failedRequest(null);

        expect(error.message).toBe('Failed to save entry');
        expect(userFacingError(t, error, 'screen message')).toBe('screen message');
    });

    it('gives the screen\'s own message for something the API said that nobody would understand', async () => {
        const error = await failedRequest({ error: 'Invalid bounds: min must not be greater than max' });

        expect(userFacingError(t, error, 'screen message')).toBe('screen message');
    });

    it('says there is no connection when the request never reached the API', () => {
        const error = Object.assign(new TypeError('Failed to fetch'), { isNetworkError: true });

        expect(userFacingError(t, error, 'screen message')).toBe('translated:errors.networkError');
    });
});
