import { describe, expect, it } from 'vitest';
import { profilePath, profileShareUrl, usernameFromHandle } from '../../utils/profileLinks.js';

describe('profile links by name', () => {
    it('links a profile by its username', () => {
        expect(profilePath('tbat')).toBe('/@tbat');
    });

    it('adds the owner\'s invite code to their own link', () => {
        expect(profileShareUrl('https://tobeatraveller.com', 'tbat', 'tbat')).toBe('https://tobeatraveller.com/@tbat?ref=tbat');
    });

    it('leaves the code out of someone else\'s link', () => {
        expect(profileShareUrl('https://tobeatraveller.com', 'ana')).toBe('https://tobeatraveller.com/@ana');
    });

    it('reads the username back from the link', () => {
        expect(usernameFromHandle('@tbat')).toBe('tbat');
        expect(usernameFromHandle('@ana.surf')).toBe('ana.surf');
    });

    it('tells a page that is not a profile apart', () => {
        expect(usernameFromHandle('pricing')).toBeNull();
        expect(usernameFromHandle('@')).toBeNull();
    });
});
