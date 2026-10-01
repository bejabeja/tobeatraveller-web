import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACT_REASONS, PASSWORD_MIN_LENGTH } from '../../utils/schemasValidation.js';
import { TRAVEL_STYLES } from '../../utils/travelStyle.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const apiSource = (path) => readFileSync(resolve(REPO_ROOT, 'api/src/utils', path), 'utf8');

// api/ has no dependency on shared/, so these are written twice: a change to one that
// misses the other would let the apps offer what the API refuses, or the reverse.
const listIn = (source, name) => {
    const match = source.match(new RegExp(`${name}\\s*=\\s*(?:Object\\.freeze\\()?\\[([^\\]]*)\\]`));
    expect(match, `${name} not found in the API`).not.toBeNull();
    return match[1].split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

describe('what the API and the shared code both define', () => {
    it('the ways of travelling', () => {
        expect(listIn(apiSource('travelStyles.js'), 'TRAVEL_STYLES')).toEqual(Object.values(TRAVEL_STYLES));
    });

    it('the reasons to write to us', () => {
        expect(listIn(apiSource('schemasValidation.js'), 'CONTACT_REASONS')).toEqual(CONTACT_REASONS);
    });

    it('the shortest password', () => {
        const match = apiSource('schemasValidation.js').match(/PASSWORD_MIN_LENGTH\s*=\s*(\d+)/);
        expect(match).not.toBeNull();
        expect(Number(match[1])).toBe(PASSWORD_MIN_LENGTH);
    });
});
