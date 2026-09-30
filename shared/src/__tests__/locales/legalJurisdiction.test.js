import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it_ from '../../locales/it.json';
import de from '../../locales/de.json';

const LOCALES = [['en', en], ['es', es], ['fr', fr], ['it', it_], ['de', de]];
const SPAIN = /Spain|España|Espagne|Spanien|Spagna|AEPD/i;
const SWITZERLAND = /Switzerland|Suiza|Suisse|Schweiz|Svizzera/i;

// The service is operated from Switzerland. The legal texts assumed Spain (law,
// courts and data protection authority), which is not where it is run from.
describe.each(LOCALES)('legal texts in %s', (_language, locale) => {
    const terms = locale.legalTerms;
    const privacy = locale.legalPrivacy;

    it('are governed by Swiss law, not Spanish, without taking away the consumer protection of where they live', () => {
        expect(terms.s13Body).toMatch(SWITZERLAND);
        expect(terms.s13Body).not.toMatch(SPAIN);
    });

    it('say the service is operated from Switzerland', () => {
        expect(terms.s14Body).toMatch(SWITZERLAND);
        expect(privacy.s1Body).toMatch(SWITZERLAND);
    });

    it('point to the Swiss data protection authority, and not only to the Spanish one', () => {
        expect(privacy.s6Body3).toContain('edoeb.admin.ch');
        expect(privacy.s6Body3).not.toMatch(SPAIN);
    });

    it('mention the Swiss data protection law next to the GDPR', () => {
        expect(privacy.s3Body3).toMatch(/FADP|LPD|DSG/);
        expect(privacy.s3Body3).toMatch(/GDPR|RGPD|DSGVO/);
    });

    it('say the price includes the taxes that apply where the customer lives', () => {
        expect(terms.subscriptionsItems[0]).toMatch(/VAT|IVA|TVA|Mehrwertsteuer/);
    });
});
