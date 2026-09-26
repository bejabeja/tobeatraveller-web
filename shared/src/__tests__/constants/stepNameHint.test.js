import { describe, expect, it } from 'vitest';
import { stepNameHintKey } from '../../utils/constants/constants.js';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it_ from '../../locales/it.json';

const LOCALES = { de, en, es, fr, it: it_ };
const translate = (locale, key) => key.split('.').reduce((node, part) => node?.[part], locale);

describe('stepNameHintKey', () => {
    // Regression: the examples were written in English inside the forms, so
    // every language showed "e.g. Santa Claus Express…".
    it.each(['transport', 'flight', 'accommodation', 'activity', 'local_tip'])('has an example for %s in every language', (stepType) => {
        const key = stepNameHintKey(stepType);

        for (const locale of Object.values(LOCALES)) {
            expect(translate(locale, key)).toEqual(expect.any(String));
        }
        expect(translate(es, key)).not.toBe(translate(en, key));
    });

    it('gives no example for a step type without one, or no type yet', () => {
        expect(stepNameHintKey('beach')).toBeNull();
        expect(stepNameHintKey(undefined)).toBeNull();
    });
});
