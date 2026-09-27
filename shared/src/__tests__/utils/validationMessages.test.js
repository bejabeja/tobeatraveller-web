import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loginSchema, signupSchema, supplyItemSchema } from '../../utils/schemasValidation.js';
import { translateValidationMessage } from '../../utils/validationMessages.js';

const LOCALES = ['es', 'en', 'fr', 'it', 'de'].map(language => [language, JSON.parse(readFileSync(new URL(`../../locales/${language}.json`, import.meta.url)))]);
const schemasSource = readFileSync(new URL('../../utils/schemasValidation.js', import.meta.url), 'utf8');
const usedKeys = [...new Set(schemasSource.match(/validation\.[a-zA-Z]+/g))];

const messagesOf = (result) => result.error.issues.map(issue => issue.message);

describe('validation messages', () => {
    // Regression: the schemas carried English sentences, shown as they were
    // in every language.
    it.each(LOCALES)('has every message the schemas use in %s', (_language, locale) => {
        for (const key of usedKeys) {
            expect(locale.validation?.[key.replace('validation.', '')], key).toEqual(expect.any(String));
        }
    });

    it('gives keys, not English, for the messages written in the schemas', () => {
        const result = signupSchema.safeParse({ email: 'nope', username: 'a b', password: '123', confirmPassword: '456' });

        expect(messagesOf(result)).toEqual(expect.arrayContaining([
            'validation.emailInvalid', 'validation.usernameNoSpaces', 'validation.passwordMin', 'validation.passwordsMismatch',
        ]));
    });

    it("gives a key instead of Zod's English default for a missing field", () => {
        const result = loginSchema.safeParse({ password: 'secret1' });

        expect(messagesOf(result)).toEqual(['validation.required']);
    });

    it('keeps the messages of cross-field rules as keys', () => {
        const result = supplyItemSchema.safeParse({ name: 'Agua', category: 'food', amount: '1.5', unit: 'units', notes: '' });

        expect(messagesOf(result)).toEqual(['validation.unitNoDecimals']);
    });
});

describe('translateValidationMessage()', () => {
    const t = (key) => `translated:${key}`;

    it('translates a validation key', () => {
        expect(translateValidationMessage(t, 'validation.emailInvalid')).toBe('translated:validation.emailInvalid');
    });

    it("shows a message from the API as it came", () => {
        expect(translateValidationMessage(t, 'Email already in use')).toBe('Email already in use');
        expect(translateValidationMessage(t, undefined)).toBeUndefined();
    });
});
