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
import { contentRemovedTemplate } from '../../emails/templates/contentRemoved.js';
import { reportDecisionTemplate } from '../../emails/templates/reportDecision.js';
import { reportReceivedTemplate } from '../../emails/templates/reportReceived.js';
import { passwordChangedTemplate } from '../../emails/templates/passwordChanged.js';
import { passwordResetTemplate } from '../../emails/templates/passwordReset.js';
import { referralRewardTemplate } from '../../emails/templates/referralReward.js';
import { verifyEmailTemplate } from '../../emails/templates/verifyEmail.js';
import { trialEndedTemplate } from '../../emails/templates/trialEnded.js';
import { trialEndingTemplate } from '../../emails/templates/trialEnding.js';
import { welcomeTemplate } from '../../emails/templates/welcome.js';

const USER_EMAILS = {
    welcome: (language) => welcomeTemplate({ username: 'ana', language }),
    passwordReset: (language) => passwordResetTemplate({ username: 'ana', token: 'token-1', language }),
    passwordChanged: (language) => passwordChangedTemplate({ username: 'ana', language }),
    accountDeleted: (language) => accountDeletedTemplate({ username: 'ana', language }),
    referralReward: (language) => referralRewardTemplate({ username: 'ana', friendUsername: 'bob', language }),
    contactConfirmation: (language) => contactConfirmationTemplate({ name: 'Ana', language }),
    trialEnding: (language) => trialEndingTemplate({ username: 'ana', endsAt: '2026-10-05T10:00:00Z', hasPaymentMethod: false, language }),
    trialEnded: (language) => trialEndedTemplate({ username: 'ana', language }),
    verifyEmail: (language) => verifyEmailTemplate({ username: 'ana', token: 'tok-1', language }),
    reportReceived: (language) => reportReceivedTemplate({ username: 'ana', targetType: 'comment', language }),
    reportDecision: (language) => reportDecisionTemplate({ username: 'ana', targetType: 'comment', outcome: 'removed', language }),
    contentRemoved: (language) => contentRemovedTemplate({ username: 'ana', targetType: 'comment', reason: 'spam', excerpt: 'hola', language }),
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
    const copyOf = (language) => ({ en, es, fr, it: italian, de })[language];
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

    it.each(['en', 'es', 'fr', 'it', 'de'])('says in %s whether the card will be charged when the trial ends', (language) => {
        const withCard = trialEndingTemplate({ username: 'ana', endsAt: '2026-10-05T10:00:00Z', hasPaymentMethod: true, language }).html;
        const noCard = trialEndingTemplate({ username: 'ana', endsAt: '2026-10-05T10:00:00Z', hasPaymentMethod: false, language }).html;

        expect(withCard).not.toBe(noCard);
        expect(withCard).toContain(copyOf(language).trialEnding.ctaWithCard);
        expect(noCard).toContain(copyOf(language).trialEnding.ctaNoCard);
    });

    it.each(['en', 'es', 'fr', 'it', 'de'])('tells, in %s, that the other sessions were ended and how to recover the account', (language) => {
        const { html } = passwordChangedTemplate({ username: 'ana', language });

        expect(html).toContain(copyOf(language).passwordChanged.sessionsEnded);
        expect(html).toContain('/forgot-password');
    });

    it.each(['en', 'es', 'fr', 'it', 'de'])('puts the confirmation link, for that token, in the email in %s', (language) => {
        const { html } = verifyEmailTemplate({ username: 'ana', token: 'tok-1', language });

        expect(html).toContain('/verify-email?token=tok-1');
    });

    it.each(['en', 'es', 'fr', 'it', 'de'])('welcomes with a confirmation button only when there is a link, in %s', (language) => {
        const withLink = welcomeTemplate({ username: 'ana', verifyToken: 'tok-1', language }).html;
        const withoutLink = welcomeTemplate({ username: 'ana', language }).html;

        expect(withLink).toContain('/verify-email?token=tok-1');
        expect(withLink).toContain(copyOf(language).welcome.verifyCta);
        expect(withoutLink).not.toContain('verify-email');
    });

    it.each(['en', 'es', 'fr', 'it', 'de'])('sends the welcome button to the account, not to the community, in %s', (language) => {
        const { html } = USER_EMAILS.welcome(language);

        const cta = copyOf(language).welcome.cta;
        const href = html.match(new RegExp(`<a href="([^"]*)"[^>]*>\\s*${cta}`))[1];

        expect(href).not.toContain('/explore');
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

describe('report emails', () => {
    it.each(['removed', 'dismissed', 'resolved'])('tells the reporter what was decided when it is %s, and how to disagree', (outcome) => {
        const { html } = reportDecisionTemplate({ username: 'ana', targetType: 'itinerary', outcome, language: 'en' });

        expect(html).toContain(en.reportDecision[outcome]('trip'));
        expect(html).toContain(en.reportDecision.redress);
    });

    // The statement of reasons the law asks for when content is taken down.
    it('tells the author what was removed, why, how it was decided and what they can do', () => {
        const { html } = contentRemovedTemplate({ username: 'bob', targetType: 'itinerary', reason: 'harassment', excerpt: 'My trip', language: 'en' });

        expect(html).toContain('My trip');
        expect(html).toContain(en.contentRemoved.restriction.itinerary);
        expect(html).toContain(en.reportReasons.harassment);
        expect(html).toContain(en.contentRemoved.how);
        expect(html).toContain(en.contentRemoved.redress);
        expect(html).toContain('/terms');
    });

    it('does not let the removed text run as markup in the email', () => {
        const { html } = contentRemovedTemplate({ username: 'bob', targetType: 'comment', reason: 'spam', excerpt: '<script>alert(1)</script>', language: 'en' });

        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('never says who reported', () => {
        const { html } = contentRemovedTemplate({ username: 'bob', targetType: 'comment', reason: 'spam', excerpt: 'x', language: 'en' });

        expect(html).not.toMatch(/reported by|denunciad[oa] por/i);
    });
});
