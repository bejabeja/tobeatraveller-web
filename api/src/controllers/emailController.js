import { ValidationError } from '../errors/ValidationError.js';
import { contactSchema } from '../utils/schemasValidation.js';
import { logger } from '../utils/logger.js';

export class ContactController {
    constructor(emailService) {
        this.emailService = emailService;
    }

    async sendContact(req, res, next) {
        const result = contactSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError('Contact validation failed'));
        }
        try {
            const { name, email, subject, message, language } = result.data;
            await this.emailService.sendContactNotification({ name, email, subject, message });
            // Confirmation to the sender: fire and forget, doesn't block the response
            this.emailService.sendContactConfirmation({ name, email, language })
                .catch(err => logger.error('[email] contact confirmation failed:', err));
            return res.status(200).json({ message: 'Message sent' });
        } catch (error) {
            next(error);
        }
    }
}
