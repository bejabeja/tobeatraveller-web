import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactService } from '../../services/contactService.js';

const makeUser = (overrides = {}) => ({
    id: 'user-1',
    username: 'ana',
    email: 'ana@example.com',
    isPremium: () => true,
    ...overrides,
});

const contact = {
    name: 'Ana',
    email: 'ana@example.com',
    reason: 'payment',
    subject: 'Cobro',
    message: 'Me cobraron dos veces',
    language: 'es',
};

describe('ContactService', () => {
    let emailService;
    let userRepository;
    let subscriptionRepository;
    let service;

    beforeEach(() => {
        emailService = {
            sendContactNotification: vi.fn().mockResolvedValue(undefined),
            sendContactConfirmation: vi.fn().mockResolvedValue(undefined),
        };
        userRepository = { getUserById: vi.fn().mockResolvedValue(makeUser()) };
        subscriptionRepository = { findByUserId: vi.fn().mockResolvedValue([{ status: 'past_due' }]) };
        service = new ContactService(emailService, userRepository, subscriptionRepository);
    });

    it('sends the message to the inbox with the reason and the account that wrote it', async () => {
        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactNotification).toHaveBeenCalledWith({
            name: 'Ana',
            email: 'ana@example.com',
            reason: 'payment',
            subject: 'Cobro',
            message: 'Me cobraron dos veces',
            account: { id: 'user-1', username: 'ana', isPremium: true, subscriptionStatus: 'past_due', accountEmail: null },
        });
    });

    it('uses the most recent subscription to tell its state', async () => {
        subscriptionRepository.findByUserId.mockResolvedValue([{ status: 'active' }, { status: 'canceled' }]);

        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactNotification.mock.calls[0][0].account.subscriptionStatus).toBe('active');
    });

    it('reports no subscription for an account that never had one', async () => {
        subscriptionRepository.findByUserId.mockResolvedValue([]);

        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactNotification.mock.calls[0][0].account.subscriptionStatus).toBeNull();
    });

    it('reports the account email when it is not the one typed, ignoring case', async () => {
        await service.sendContact({ ...contact, email: 'ANA@example.com' }, 'user-1');
        expect(emailService.sendContactNotification.mock.calls[0][0].account.accountEmail).toBeNull();

        await service.sendContact({ ...contact, email: 'someone.else@example.com' }, 'user-1');
        expect(emailService.sendContactNotification.mock.calls[1][0].account.accountEmail).toBe('ana@example.com');
    });

    it('sends it as anonymous, without looking anything up, when there is no session', async () => {
        await service.sendContact(contact, undefined);

        expect(userRepository.getUserById).not.toHaveBeenCalled();
        expect(emailService.sendContactNotification.mock.calls[0][0].account).toBeNull();
    });

    it('sends it as anonymous when the account no longer exists', async () => {
        userRepository.getUserById.mockResolvedValue(null);

        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactNotification.mock.calls[0][0].account).toBeNull();
    });

    it('does not lose the message when the account cannot be looked up', async () => {
        userRepository.getUserById.mockRejectedValue(new Error('db down'));

        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactNotification).toHaveBeenCalledTimes(1);
        expect(emailService.sendContactNotification.mock.calls[0][0].account).toBeNull();
    });

    it('sends the confirmation to the sender in their language', async () => {
        await service.sendContact(contact, 'user-1');

        expect(emailService.sendContactConfirmation).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@example.com', language: 'es' });
    });

    it('still answers when the confirmation fails', async () => {
        emailService.sendContactConfirmation.mockRejectedValue(new Error('smtp down'));

        await expect(service.sendContact(contact, 'user-1')).resolves.toBeUndefined();
    });

    it('fails when the message to the inbox cannot be sent, so the person is told', async () => {
        emailService.sendContactNotification.mockRejectedValue(new Error('smtp down'));

        await expect(service.sendContact(contact, 'user-1')).rejects.toThrow('smtp down');
        expect(emailService.sendContactConfirmation).not.toHaveBeenCalled();
    });
});
