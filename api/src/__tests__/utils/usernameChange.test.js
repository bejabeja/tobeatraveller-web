import { describe, expect, it } from 'vitest';
import { isUsernameChange, usernameChangeAvailableAt } from '../../utils/usernameChange.js';

const NOW = new Date('2026-09-26T12:00:00Z');

describe('usernameChangeAvailableAt()', () => {
    it('allows a first change', () => {
        expect(usernameChangeAvailableAt(null, NOW)).toBeNull();
    });

    it('gives the date 30 days after the last change while it has not come', () => {
        expect(usernameChangeAvailableAt('2026-09-16T12:00:00Z', NOW)).toEqual(new Date('2026-10-16T12:00:00Z'));
    });

    it('allows a change once the 30 days are over', () => {
        expect(usernameChangeAvailableAt('2026-08-01T12:00:00Z', NOW)).toBeNull();
    });
});

describe('isUsernameChange()', () => {
    it('counts a different name', () => {
        expect(isUsernameChange('jane', 'jane_vanlife')).toBe(true);
    });

    it('does not count capitals, nor an unchanged or missing name', () => {
        expect(isUsernameChange('jane', 'Jane')).toBe(false);
        expect(isUsernameChange('jane', 'jane')).toBe(false);
        expect(isUsernameChange('jane', undefined)).toBe(false);
    });
});
