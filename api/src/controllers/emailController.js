import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

const contactSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    subject: z.string().min(2, 'Subject must be at least 2 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
});

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
            const { name, email, subject, message } = result.data;
            await this.emailService.sendContactNotification({ name, email, subject, message });
            // Confirmation to the sender — fire and forget, doesn't block the response
            this.emailService.sendContactConfirmation({ name, email })
                .catch(err => console.error('[email] contact confirmation failed:', err));
            return res.status(200).json({ message: 'Message sent' });
        } catch (error) {
            next(error);
        }
    }
}
