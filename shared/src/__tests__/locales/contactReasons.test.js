import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it_ from '../../locales/it.json';
import de from '../../locales/de.json';
import { CONTACT_REASONS } from '../../utils/schemasValidation.js';

const LOCALES = [['en', en], ['es', es], ['fr', fr], ['it', it_], ['de', de]];
const labelKey = (reason) => `reason${reason[0].toUpperCase()}${reason.slice(1)}`;

// The screens look the labels up by key, so a reason added without its text would show the key.
describe.each(LOCALES)('contact reasons in %s', (_language, locale) => {
    it.each(CONTACT_REASONS)('have a label for %s', (reason) => {
        expect(locale.contact[labelKey(reason)]).toEqual(expect.any(String));
        expect(locale.contact[labelKey(reason)].length).toBeGreaterThan(0);
    });
});
