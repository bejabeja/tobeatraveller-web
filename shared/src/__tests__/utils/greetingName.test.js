import { describe, expect, it } from 'vitest';
import { greetingName } from '../../utils/greetingName.js';

describe('greetingName', () => {
    it('uses the first name when there is a name', () => {
        expect(greetingName({ name: 'Miriam Abella', username: 'miri' })).toBe('Miriam');
    });

    it('ignores extra spaces around the name', () => {
        expect(greetingName({ name: '  Miriam   Abella ', username: 'miri' })).toBe('Miriam');
    });

    it('falls back to the username when the name is empty or missing', () => {
        expect(greetingName({ name: '', username: 'miri' })).toBe('miri');
        expect(greetingName({ name: '   ', username: 'miri' })).toBe('miri');
        expect(greetingName({ username: 'miri' })).toBe('miri');
    });

    it('is empty rather than failing when it knows nothing yet', () => {
        expect(greetingName()).toBe('');
        expect(greetingName({})).toBe('');
    });
});
