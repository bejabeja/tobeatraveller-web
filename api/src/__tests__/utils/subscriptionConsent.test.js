import { describe, expect, it } from 'vitest';
import { consentLanguageFor, consentMessageFor } from '../../utils/subscriptionConsent.js';

// Stripe shows this next to the box the customer ticks before paying right away.
describe('subscriptionConsent', () => {
    const languages = ['en', 'es', 'fr', 'de', 'it'];

    it.each(languages)('has the request to start right away, the acknowledgment and the link to the terms in %s', (language) => {
        const message = consentMessageFor(language, 'https://app.test/terms');

        expect(message).toContain('14');
        expect(message).toContain('](https://app.test/terms)');
    });

    it.each(languages)('fits what Stripe accepts (1200 characters) in %s', (language) => {
        expect(consentMessageFor(language, 'https://app.test/terms').length).toBeLessThanOrEqual(1200);
    });

    it('uses the language of the customer when there is text in it, English otherwise', () => {
        expect(consentLanguageFor('fr')).toBe('fr');
        expect(consentLanguageFor('pt')).toBe('en');
        expect(consentLanguageFor(undefined)).toBe('en');
    });
});
