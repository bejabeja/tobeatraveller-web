import { Router } from 'express';
import { ContactController } from '../controllers/emailController.js';
import { optionalAuthenticate } from '../middlewares/authenticate.js';
import { perEmailContactRateLimit, perIpContactRateLimit } from '../middlewares/contactRateLimit.js';
import { SubscriptionRepository } from '../repositories/subscriptionRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { ContactService } from '../services/contactService.js';
import { EmailService } from '../services/emailService.js';

export const createEmailRouter = () => {
    const router = Router();
    const contactService = new ContactService(new EmailService(), new UserRepository(), new SubscriptionRepository());
    const contactController = new ContactController(contactService);

    router.post('/contact', perIpContactRateLimit, perEmailContactRateLimit, optionalAuthenticate, contactController.sendContact.bind(contactController));

    return router;
};
