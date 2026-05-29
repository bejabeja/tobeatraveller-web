import config from '../config/config.js';
import { accountDeletedTemplate } from '../emails/templates/accountDeleted.js';
import { contactTemplate } from '../emails/templates/contact.js';
import { passwordResetTemplate } from '../emails/templates/passwordReset.js';
import { welcomeTemplate } from '../emails/templates/welcome.js';

export class EmailService {
    constructor() {
        this.apiKey = config.brevoApiKey;
        this.senderEmail = config.brevoSenderEmail;
        this.senderName = config.brevoSenderName;
    }

    async _send({ to, subject, html, replyTo }) {
        if (!this.apiKey) {
            console.warn('[email] BREVO_API_KEY is not set — skipping email send');
            return;
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': this.apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: this.senderName, email: this.senderEmail },
                to: [{ email: to }],
                subject,
                htmlContent: html,
                ...(replyTo ? { replyTo: { email: replyTo } } : {}),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[email] Brevo error ${response.status}: ${errorText}`);
        }
    }

    async sendWelcome({ username, email }) {
        const { subject, html } = welcomeTemplate({ username });
        await this._send({ to: email, subject, html });
    }

    async sendContactNotification({ name, email, subject, message }) {
        const { subject: emailSubject, html } = contactTemplate({ name, email, subject, message });
        await this._send({ to: this.senderEmail, subject: emailSubject, html, replyTo: email });
    }

    async sendPasswordReset({ username, email, token }) {
        const { subject, html } = passwordResetTemplate({ username, token });
        await this._send({ to: email, subject, html });
    }

    async sendAccountDeleted({ username, email }) {
        const { subject, html } = accountDeletedTemplate({ username });
        await this._send({ to: email, subject, html });
    }
}
