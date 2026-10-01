import { ValidationError } from '../errors/ValidationError.js';
import { contactSchema } from '../utils/schemasValidation.js';

export class ContactController {
    constructor(contactService) {
        this.contactService = contactService;
    }

    async sendContact(req, res, next) {
        const result = contactSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || 'Contact validation failed'));
        }
        try {
            await this.contactService.sendContact(result.data, req.user?.id);
            return res.status(200).json({ message: 'Message sent' });
        } catch (error) {
            next(error);
        }
    }
}
