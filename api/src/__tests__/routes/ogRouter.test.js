import { describe, expect, it } from 'vitest';
import { passportPageUrls } from '../../routes/ogRouter.js';

const APP_URL = 'https://tobeatraveller.com';

describe('passportPageUrls()', () => {
    it("leads to the passport page keeping the sharer's referral code", () => {
        expect(passportPageUrls(APP_URL, 'u1', 'jane.doe')).toEqual({
            pageUrl: 'https://tobeatraveller.com/profile/u1/passport',
            redirectUrl: 'https://tobeatraveller.com/profile/u1/passport?ref=jane.doe',
        });
    });

    it('encodes the referral code so it cannot add other parameters', () => {
        expect(passportPageUrls(APP_URL, 'u1', 'a&next=https://evil.test').redirectUrl)
            .toBe('https://tobeatraveller.com/profile/u1/passport?ref=a%26next%3Dhttps%3A%2F%2Fevil.test');
    });

    it('ignores a missing or repeated ref parameter', () => {
        expect(passportPageUrls(APP_URL, 'u1', undefined).redirectUrl).toBe('https://tobeatraveller.com/profile/u1/passport');
        expect(passportPageUrls(APP_URL, 'u1', ['a', 'b']).redirectUrl).toBe('https://tobeatraveller.com/profile/u1/passport');
    });
});
