import { describe, it, expect } from 'vitest';
import { isNetworkError, isPremiumRequiredError, parseError, setApiErrorTranslator } from '../../utils/parseError.js';

// Regression coverage: callers need to tell a 403 (e.g. a premium-only
// feature) apart from any other failure to show the right message, which
// requires the thrown error to carry the response status.
describe('parseError', () => {
    it('throws an error with the backend message and the response status attached', async () => {
        const response = { status: 403, json: async () => ({ error: 'This feature requires a premium subscription' }) };

        await expect(parseError(response)).rejects.toMatchObject({
            message: 'This feature requires a premium subscription',
            status: 403,
        });
    });

    it('falls back to the default message but still attaches the status when the body is not JSON', async () => {
        const response = { status: 500, json: async () => { throw new Error('not json'); } };

        await expect(parseError(response, 'Something went wrong')).rejects.toMatchObject({
            message: 'Something went wrong',
            status: 500,
        });
    });

    // Regression coverage: form-level errors need to know which field to attach the
    // message to (e.g. a taken username), which requires the backend's "field" to
    // survive the round trip instead of being dropped alongside the message.
    it('attaches the field the backend blamed, when present', async () => {
        const response = { status: 400, json: async () => ({ error: 'No valid location', field: 'location' }) };

        await expect(parseError(response)).rejects.toMatchObject({
            message: 'No valid location',
            field: 'location',
        });
    });
});

describe('isPremiumRequiredError', () => {
    it('is true only for a 403 error', () => {
        expect(isPremiumRequiredError({ status: 403 })).toBe(true);
        expect(isPremiumRequiredError({ status: 500 })).toBe(false);
        expect(isPremiumRequiredError({})).toBe(false);
        expect(isPremiumRequiredError(undefined)).toBe(false);
    });
});

describe('isNetworkError', () => {
    it('is true when authFetch marked the error as a network failure', () => {
        expect(isNetworkError({ isNetworkError: true })).toBe(true);
    });

    it('falls back to matching common raw fetch failure messages', () => {
        expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
        expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('is false for an ordinary server error', () => {
        expect(isNetworkError({ status: 500, message: 'Internal server error' })).toBe(false);
        expect(isNetworkError(undefined)).toBe(false);
    });
});

// Regression: the apps translated their own validation messages, but one
// from the API (the same kind of check, turned down on the server) was shown
// in English.
describe('parseError with the app language', () => {
    const t = (key) => ({ 'validation.tooLong': 'Es demasiado largo' })[key] ?? key;

    it('translates a validation message from the API', async () => {
        setApiErrorTranslator(t);
        const response = { status: 400, json: async () => ({ error: 'validation.tooLong', field: 'bio' }) };

        await expect(parseError(response)).rejects.toMatchObject({ message: 'Es demasiado largo', field: 'bio' });
    });

    it('leaves any other message from the API as it came', async () => {
        setApiErrorTranslator(t);
        const response = { status: 409, json: async () => ({ error: 'Email already in use' }) };

        await expect(parseError(response)).rejects.toMatchObject({ message: 'Email already in use' });
    });
});
