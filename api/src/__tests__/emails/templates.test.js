import { describe, expect, it } from 'vitest';
import { de } from '../../emails/locales/de.js';
import { en } from '../../emails/locales/en.js';
import { es } from '../../emails/locales/es.js';
import { fr } from '../../emails/locales/fr.js';
import { it as italian } from '../../emails/locales/it.js';
import { accountDeletedTemplate } from '../../emails/templates/accountDeleted.js';
import { contactConfirmationTemplate } from '../../emails/templates/contactConfirmation.js';
import { contactTemplate } from '../../emails/templates/contact.js';
import { contactSchema } from '../../utils/schemasValidation.js';
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

describe('contact emails', () => {
    const hostile = {
        name: '<img src=x onerror=alert(1)>',
        email: 'a@b.co"><a href="https://evil.example">x</a>',
        subject: '<b>URGENT</b>',
        message: '<a href="https://evil.example">Reset your password</a>',
    };

    it('shows what the sender typed as text, never as HTML, in the message to the inbox', () => {
        const { html } = contactTemplate({ ...hostile, reason: 'bug' });

        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<a href="https://evil.example">');
        expect(html).not.toContain('<b>URGENT</b>');
        expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;Reset your password&lt;/a&gt;');
    });

    // Regression-in-waiting: a reason added to the form without a label here reads "[undefined]" in the inbox.
    it.each(contactSchema.shape.reason.options)('tags the subject with a label for the reason %s', (reason) => {
        const { subject } = contactTemplate({ ...hostile, reason, subject: 'Hola' });

        expect(subject).toMatch(/^\[Contact\] \[[A-Z][a-z]+\] Hola$/);
    });

    it('keeps the subject line readable and tagged with the reason', () => {
        expect(contactTemplate({ ...hostile, reason: 'payment', subject: 'Pago & factura' }).subject).toBe('[Contact] [Payment] Pago & factura');
    });

    it.each(['en', 'es', 'fr', 'it', 'de'])('does not let the sender name inject HTML into the confirmation in %s', (language) => {
        const { html } = contactConfirmationTemplate({ name: hostile.name, language });

        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    describe('who is writing', () => {
        const message = { name: 'Ana', email: 'ana@example.com', reason: 'payment', subject: 'Cobro', message: 'Me cobraron dos veces' };
        const account = { id: 'user-1', username: 'ana', isPremium: true, subscriptionStatus: 'past_due', accountEmail: null };

        it('shows the account, its plan and the state of its subscription to whoever answers', () => {
            const { html } = contactTemplate({ ...message, account });

            expect(html).toContain('@ana');
            expect(html).toContain('user-1');
            expect(html).toContain('Premium (subscription past_due)');
        });

        it('says so when the message was sent without a session', () => {
            expect(contactTemplate({ ...message, account: null }).html).toContain('No session (anonymous)');
        });

        it('warns when the email typed is not the one of the account', () => {
            const { html } = contactTemplate({ ...message, account: { ...account, accountEmail: 'other@example.com' } });

            expect(html).toContain("differs from the account's (other@example.com)");
        });

        it('does not warn when the email is the one of the account', () => {
            expect(contactTemplate({ ...message, account }).html).not.toContain('differs from the account');
        });

        it('shows the free plan for an account without subscription', () => {
            const { html } = contactTemplate({ ...message, account: { ...account, isPremium: false, subscriptionStatus: null } });

            expect(html).toContain('>Free<');
        });

        it('does not let a username inject HTML', () => {
            const { html } = contactTemplate({ ...message, account: { ...account, username: '<b>x</b>' } });

            expect(html).not.toContain('<b>x</b>');
        });
    });
});
