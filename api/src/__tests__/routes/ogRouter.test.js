import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// No database in these tests: a lookup that reaches it fails, as for a trip that does not exist.
vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn().mockRejectedValue(new Error('no database in tests')) },
}));
vi.mock('../../config/config.js', () => ({ default: { appUrl: 'https://tobeatraveller.com' } }));

import { createOgRouter, passportPageUrls, profileHandlePageUrls } from '../../routes/ogRouter.js';

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

describe('profileHandlePageUrls()', () => {
    it("previews the profile by name, keeping the owner's invite code on the way in", () => {
        expect(profileHandlePageUrls(APP_URL, 'tbat', 'tbat')).toEqual({
            pageUrl: 'https://tobeatraveller.com/@tbat',
            redirectUrl: 'https://tobeatraveller.com/@tbat?ref=tbat',
        });
    });

    it('encodes the name and the code so they cannot add other parameters', () => {
        expect(profileHandlePageUrls(APP_URL, 'a?b', 'x&y').redirectUrl).toBe('https://tobeatraveller.com/@a%3Fb?ref=x%26y');
    });
});

// Regression: the id of the link went as it was into the page's <script>, so a link with a
// closing </script> in it ran whatever followed on the API's own origin, with the visitor's session.
describe('preview pages for a link with markup in it', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use('/og', createOgRouter());
        server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(() => new Promise((resolve) => server.close(resolve)));

    const INJECTED = encodeURIComponent('x</script><script>alert(document.domain)</script>');

    it.each(['itinerary', 'profile'])('does not let a %s link close the page script and run its own', async (kind) => {
        const html = await (await fetch(`${baseUrl}/og/${kind}/${INJECTED}`)).text();

        expect(html).not.toContain('<script>alert');
        expect(html.match(/<script>/g)).toHaveLength(1);
    });

    it.each([
        ['itinerary', 'itinerary'],
        ['profile', 'friend-profile'],
    ])('still sends a %s link with a real id on to its page', async (kind, page) => {
        const id = 'a0000001-0000-0000-0000-000000000014';
        const html = await (await fetch(`${baseUrl}/og/${kind}/${id}`)).text();

        expect(html).toContain(`window.location.replace("https://tobeatraveller.com/${page}/${id}")`);
    });

    it.each(['itinerary', 'profile'])('sends a %s link that is not a real id to the app, not to an address made from it', async (kind) => {
        const html = await (await fetch(`${baseUrl}/og/${kind}/${INJECTED}`)).text();

        expect(html).toContain('window.location.replace("https://tobeatraveller.com")');
    });
});
