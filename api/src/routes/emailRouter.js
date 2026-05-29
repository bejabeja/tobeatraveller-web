import { Router } from 'express';
import { ContactController } from '../controllers/emailController.js';
import { EmailService } from '../services/emailService.js';

export const createEmailRouter = () => {
    const router = Router();
    const emailService = new EmailService();
    const contactController = new ContactController(emailService);

    router.post('/contact', contactController.sendContact.bind(contactController));

    return router;
};
