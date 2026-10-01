import { logger } from '../utils/logger.js';

export class ContactService {
    constructor(emailService, userRepository, subscriptionRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    async sendContact({ name, email, reason, subject, message, language }, userId) {
        const account = await this._describeSender(userId, email);
        await this.emailService.sendContactNotification({ name, email, reason, subject, message, account });
        // The confirmation to the sender does not block the answer
        this.emailService.sendContactConfirmation({ name, email, language })
            .catch(err => logger.error('[email] contact confirmation failed:', err));
    }

    // Context for support (who is writing, on which plan), never a reason to lose the message:
    // null when there is no session or the account cannot be looked up.
    async _describeSender(userId, typedEmail) {
        if (!userId) return null;
        try {
            const user = await this.userRepository.getUserById(userId);
            if (!user) return null;
            const subscriptions = await this.subscriptionRepository.findByUserId(userId);
            return {
                id: user.id,
                username: user.username,
                isPremium: user.isPremium(),
                subscriptionStatus: subscriptions[0]?.status ?? null,
                accountEmail: user.email.toLowerCase() === typedEmail.toLowerCase() ? null : user.email,
            };
        } catch (error) {
            logger.warn('[contact] could not look up the sender account:', error);
            return null;
        }
    }
}
