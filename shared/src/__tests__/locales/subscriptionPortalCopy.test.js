import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it_ from '../../locales/it.json';
import de from '../../locales/de.json';

// What each language would say to promise switching plan.
const PLAN_CHANGE = { en: /plan/i, es: /plan/i, fr: /formule|plan/i, de: /Tarif|Plan/i, it: /piano/i };

// The billing portal lets the customer cancel, update the card and see the
// invoices. Switching between the monthly and the yearly plan is not set up in
// it, so the page must not promise it.
describe.each([['en', en], ['es', es], ['fr', fr], ['it', it_], ['de', de]])('what the portal is said to allow in %s', (language, locale) => {
    it('does not promise to change plan in the hint next to the manage button', () => {
        expect(locale.subscription.manageHint).not.toMatch(PLAN_CHANGE[language]);
    });

    it('does not promise it in the FAQ about invoices and the card', () => {
        expect(locale.subscription.faqInvoicesAnswer).not.toMatch(PLAN_CHANGE[language]);
    });

    it('still says what it does allow: cancel, the card and the invoices', () => {
        expect(locale.subscription.manageHint.length).toBeGreaterThan(20);
        expect(locale.subscription.faqInvoicesAnswer.length).toBeGreaterThan(20);
    });
});
