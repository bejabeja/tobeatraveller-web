import { describe, expect, it, vi } from 'vitest';
import { translateAuthError } from '../../utils/authErrorMessages.js';

describe('translateAuthError', () => {
    const t = vi.fn((key) => `translated:${key}`);

    it('translates a known raw backend message', () => {
        expect(translateAuthError(t, 'Invalid credentials')).toBe('translated:auth.invalidCredentials');
    });

    it('passes through an unrecognized message untouched', () => {
        expect(translateAuthError(t, 'Something the backend never said before')).toBe('Something the backend never said before');
    });

    it('translates the answer to too many attempts, which the backend sends in English', () => {
        expect(translateAuthError(t, 'Too many attempts, please try again later.')).toBe('translated:auth.tooManyAttempts');
    });
});
