import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACT_REASONS, PASSWORD_MIN_LENGTH } from '../../utils/schemasValidation.js';
import { TRAVEL_STYLES } from '../../utils/travelStyle.js';
import {
    REPORT_DECISIONS, REPORT_DETAILS_MAX_LENGTH, REPORT_ILLEGAL_DETAILS_MIN_LENGTH, REPORT_REASONS, REPORT_STATUSES, REPORT_TARGET_TYPES,
} from '../../utils/contentReports.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const apiSource = (path) => readFileSync(resolve(REPO_ROOT, 'api/src/utils', path), 'utf8');

// api/ has no dependency on shared/, so these are written twice: a change to one that
// misses the other would let the apps offer what the API refuses, or the reverse.
const listIn = (source, name) => {
    const match = source.match(new RegExp(`${name}\\s*=\\s*(?:Object\\.freeze\\()?\\[([^\\]]*)\\]`));
    expect(match, `${name} not found in the API`).not.toBeNull();
    return match[1].split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

const valuesInObject = (source, name) => {
    const match = source.match(new RegExp(`${name}\\s*=\\s*Object\\.freeze\\(\\{([^}]*)\\}\\)`));
    expect(match, `${name} not found in the API`).not.toBeNull();
    return [...match[1].matchAll(/:\s*'([^']*)'/g)].map((item) => item[1]);
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

    it('what a report can be about, why, how it ends and what the team decides', () => {
        const source = apiSource('contentReports.js');
        expect(valuesInObject(source, 'REPORT_TARGET_TYPES')).toEqual(Object.values(REPORT_TARGET_TYPES));
        expect(valuesInObject(source, 'REPORT_REASONS')).toEqual(Object.values(REPORT_REASONS));
        expect(valuesInObject(source, 'REPORT_STATUSES')).toEqual(Object.values(REPORT_STATUSES));
        expect(valuesInObject(source, 'REPORT_DECISIONS')).toEqual(Object.values(REPORT_DECISIONS));
    });

    it('the limits of what a report says', () => {
        const source = apiSource('contentReports.js');
        expect(Number(source.match(/REPORT_DETAILS_MAX_LENGTH\s*=\s*(\d+)/)[1])).toBe(REPORT_DETAILS_MAX_LENGTH);
        expect(Number(source.match(/REPORT_ILLEGAL_DETAILS_MIN_LENGTH\s*=\s*(\d+)/)[1])).toBe(REPORT_ILLEGAL_DETAILS_MIN_LENGTH);
    });
});
