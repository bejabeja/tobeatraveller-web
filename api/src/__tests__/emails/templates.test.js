import { describe, expect, it } from 'vitest';
import { de } from '../../emails/locales/de.js';
import { en } from '../../emails/locales/en.js';
import { es } from '../../emails/locales/es.js';
import { fr } from '../../emails/locales/fr.js';
import { it as italian } from '../../emails/locales/it.js';
import { accountDeletedTemplate } from '../../emails/templates/accountDeleted.js';
import { contactConfirmationTemplate } from '../../emails/templates/contactConfirmation.js';
import { passwordChangedTemplate } from '../../emails/templates/passwordChanged.js';
import { passwordResetTemplate } from '../../emails/templates/passwordReset.js';
import { referralRewardTemplate } from '../../emails/templates/referralReward.js';
import { welcomeTemplate } from '../../emails/templates/welcome.js';

const USER_EMAILS = {
    welcome: (language) => welcomeTemplate({ username: 'ana', language }),
    passwordReset: (language) => passwordResetTemplate({ username: 'ana', token: 'token-1', language }),
    passwordChanged: (language) => passwordChangedTemplate({ username: 'ana', language }),
    accountDeleted: (language) => accountDeletedTemplate({ username: 'ana', language }),
    referralReward: (language) => referralRewardTemplate({ username: 'ana', friendUsername: 'bob', language }),
    contactConfirmation: (language) => contactConfirmationTemplate({ name: 'Ana', language }),
};

// Every key, nested ones included, as "a.b.c"; arrays by index.
const keysOf = (value, prefix = '') => (
    value && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, nested]) => keysOf(nested, prefix ? `${prefix}.${key}` : key))
        : [prefix]
);

describe('user emails', () => {
    it.each([['es', es], ['fr', fr], ['it', italian], ['de', de]])('have the same copy in %s as in English', (_, copy) => {
        expect(keysOf(copy)).toEqual(keysOf(en));
    });

    const LANGUAGES = [['es', es], ['fr', fr], ['it', italian], ['de', de]];
    it.each(Object.keys(USER_EMAILS).flatMap(name => LANGUAGES.map(([language, copy]) => [name, language, copy])))(
        'writes the %s email in %s, as a page in that language',
        (name, language, copy) => {
            const { subject, html } = USER_EMAILS[name](language);

            expect(subject).toBe(copy[name].subject);
            expect(html).toContain(`<html lang="${language}"`);
            expect(html).toContain(copy.layout.rights(new Date().getFullYear()));
        },
    );

    // Users from before the language was saved, or in a language the apps
    // don't have.
    it.each([[null], [undefined], ['pt']])('writes in English when the language is %s', (language) => {
        const { subject, html } = USER_EMAILS.welcome(language);

        expect(subject).toBe(en.welcome.subject);
        expect(html).toContain('<html lang="en"');
    });

    it('keeps the reset link and the account details in any language', () => {
        expect(USER_EMAILS.passwordReset('es').html).toContain('/reset-password?token=token-1');
        expect(USER_EMAILS.referralReward('es').html).toContain('@bob');
    });
});
