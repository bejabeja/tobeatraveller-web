import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailVerificationService } from '../../services/emailVerificationService.js';
import { ReferralService } from '../../services/referralService.js';
import { AUDIT_EVENTS } from '../../utils/auditEvents.js';
import { AuthError } from '../../errors/AuthError.js';
import { ConflictError } from '../../errors/ConflictError.js';

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const HOUR_MS = 60 * 60 * 1000;

const makeUser = (overrides = {}) => ({
    id: 'user-1',
    username: 'ana',
    email: 'ana@example.com',
    language: 'es',
    isEmailVerified: () => false,
    ...overrides,
});

describe('EmailVerificationService', () => {
    let userRepository;
    let emailVerificationRepository;
    let emailService;
    let auditLogService;
    let itineraryRepository;
    let referralService;
    let service;

    beforeEach(() => {
        userRepository = {
            getUserById: vi.fn(async () => makeUser()),
            markEmailVerified: vi.fn(async () => true),
            findByEmail: vi.fn(async () => null),
            updateUnverifiedEmail: vi.fn(async () => true),
        };
        emailVerificationRepository = {
            save: vi.fn(async () => ({})),
            findByTokenHash: vi.fn(async () => ({ id: 'record-1', user_id: 'user-1' })),
            markAsUsed: vi.fn(async () => {}),
        };
        emailService = { sendVerifyEmail: vi.fn(async () => {}) };
        auditLogService = { log: vi.fn() };
        itineraryRepository = { getTotalByUserId: vi.fn(async () => 0) };
        referralService = { rewardFirstItinerary: vi.fn(async () => {}) };
        service = new EmailVerificationService(
            userRepository, emailVerificationRepository, emailService, auditLogService, itineraryRepository, referralService,
        );
    });

    describe('issueToken()', () => {
        it('gives back a token that nobody could guess', async () => {
            const first = await service.issueToken('user-1');
            const second = await service.issueToken('user-1');

            expect(first).toMatch(/^[0-9a-f]{64}$/);
            expect(second).not.toBe(first);
        });

        it('keeps only its hash, so a copy of the table confirms nobody', async () => {
            const token = await service.issueToken('user-1');

            const saved = emailVerificationRepository.save.mock.calls[0][0];
            expect(saved.tokenHash).toBe(hash(token));
            expect(JSON.stringify(saved)).not.toContain(token);
        });

        it('lets the link work for 48 hours', async () => {
            const before = Date.now();

            await service.issueToken('user-1');

            const { expiresAt } = emailVerificationRepository.save.mock.calls[0][0];
            expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(48 * HOUR_MS - 1000);
            expect(expiresAt.getTime() - before).toBeLessThanOrEqual(48 * HOUR_MS + 1000);
        });
    });

    describe('sendVerification()', () => {
        it('emails the link, in their language, to the address on the account', async () => {
            const result = await service.sendVerification('user-1');

            expect(result).toEqual({ alreadyVerified: false });
            expect(emailService.sendVerifyEmail).toHaveBeenCalledWith({
                username: 'ana', email: 'ana@example.com', token: expect.stringMatching(/^[0-9a-f]{64}$/), language: 'es',
            });
        });

        it('sends nothing to an address that is already confirmed', async () => {
            userRepository.getUserById.mockResolvedValue(makeUser({ isEmailVerified: () => true }));

            const result = await service.sendVerification('user-1');

            expect(result).toEqual({ alreadyVerified: true });
            expect(emailService.sendVerifyEmail).not.toHaveBeenCalled();
            expect(emailVerificationRepository.save).not.toHaveBeenCalled();
        });

        it('fails when the account does not exist', async () => {
            userRepository.getUserById.mockResolvedValue(null);

            await expect(service.sendVerification('ghost')).rejects.toThrow('User not found');
        });

        it('fails when the email cannot be sent, so the person is told instead of waiting for it', async () => {
            emailService.sendVerifyEmail.mockRejectedValue(new Error('brevo down'));

            await expect(service.sendVerification('user-1')).rejects.toThrow('brevo down');
        });
    });

    describe('verify()', () => {
        const TOKEN = 'a'.repeat(64);

        it('looks the token up by its hash, never by the token itself', async () => {
            await service.verify(TOKEN);

            expect(emailVerificationRepository.findByTokenHash).toHaveBeenCalledWith(hash(TOKEN));
        });

        it('confirms the account the link was issued for, and spends the link', async () => {
            await service.verify(TOKEN);

            expect(userRepository.markEmailVerified).toHaveBeenCalledWith('user-1');
            expect(emailVerificationRepository.markAsUsed).toHaveBeenCalledWith('record-1');
        });

        it('fails, and confirms nothing, for a link that is wrong, used or expired', async () => {
            emailVerificationRepository.findByTokenHash.mockResolvedValue(null);

            await expect(service.verify(TOKEN)).rejects.toThrow('Invalid or expired token');
            expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
        });

        it('leaves a trace of who confirmed, from where and when', async () => {
            await service.verify(TOKEN, { ip: '8.8.8.8', userAgent: 'test-agent' });

            expect(auditLogService.log).toHaveBeenCalledWith({
                actorId: 'user-1', actorUsername: 'ana', action: AUDIT_EVENTS.EMAIL_VERIFIED,
                ipAddress: '8.8.8.8', userAgent: 'test-agent',
            });
        });

        describe('the invite reward that was waiting for it', () => {
            const flush = () => new Promise((resolve) => setImmediate(resolve));

            it('is paid now to someone who already shared their first trip', async () => {
                itineraryRepository.getTotalByUserId.mockResolvedValue(1);

                await service.verify(TOKEN);
                await flush();

                expect(referralService.rewardFirstItinerary).toHaveBeenCalledWith('user-1');
            });

            it('keeps waiting for someone who has not shared a trip yet', async () => {
                await service.verify(TOKEN);
                await flush();

                expect(referralService.rewardFirstItinerary).not.toHaveBeenCalled();
            });

            it('does not undo the confirmation if paying it fails', async () => {
                itineraryRepository.getTotalByUserId.mockResolvedValue(1);
                referralService.rewardFirstItinerary.mockRejectedValue(new Error('db down'));

                await expect(service.verify(TOKEN)).resolves.toBeUndefined();
                await flush();

                expect(userRepository.markEmailVerified).toHaveBeenCalled();
            });
        });
    });

    describe('with the real referral service', () => {
        const flush = () => new Promise((resolve) => setImmediate(resolve));

        // Regression-in-waiting: a reward paid here must tell whoever invited them, like one paid when sharing a trip.
        it('tells whoever invited them, in the app and by email, when confirming pays the reward', async () => {
            const invited = { id: 'user-1', username: 'ana', isEmailUnconfirmed: () => false, isPremium: () => false, premiumUntil: null };
            const referrer = { id: 'referrer-1', username: 'bea', email: 'bea@example.com', language: 'es', isEmailUnconfirmed: () => false, isPremium: () => false, premiumUntil: null };
            const referralRepository = {
                findPendingByReferredUserId: vi.fn(async () => ({ id: 'referral-1', referrerId: 'referrer-1', referredUserId: 'user-1' })),
                markRewarded: vi.fn(async () => {}),
            };
            userRepository.getUserById = vi.fn(async (id) => (id === 'user-1' ? invited : referrer));
            userRepository.updatePremiumUntil = vi.fn(async () => {});
            const notificationsService = { createNotification: vi.fn(async () => {}) };
            const rewardEmails = { sendReferralReward: vi.fn(async () => {}) };
            const realReferralService = new ReferralService(referralRepository, userRepository, null, notificationsService, rewardEmails);
            itineraryRepository.getTotalByUserId.mockResolvedValue(1);
            service = new EmailVerificationService(
                userRepository, emailVerificationRepository, emailService, auditLogService, itineraryRepository, realReferralService,
            );

            await service.verify('a'.repeat(64));
            await flush();

            expect(referralRepository.markRewarded).toHaveBeenCalledWith('referral-1');
            expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
            expect(rewardEmails.sendReferralReward).toHaveBeenCalledWith(expect.objectContaining({ email: 'bea@example.com', friendUsername: 'ana' }));
        });
    });
    describe('changeUnverifiedEmail()', () => {
        const PASSWORD = 'correct-horse';
        let passwordHash;

        beforeEach(async () => {
            passwordHash = await bcrypt.hash(PASSWORD, 4);
            userRepository.getUserById.mockResolvedValue(makeUser({ password: passwordHash }));
        });

        it('moves the account to the corrected address and sends the link there', async () => {
            await service.changeUnverifiedEmail('user-1', PASSWORD, 'Ana@Nuevo.com');

            expect(userRepository.updateUnverifiedEmail).toHaveBeenCalledWith('user-1', 'ana@nuevo.com');
            expect(emailService.sendVerifyEmail).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@nuevo.com' }));
        });

        it('does not touch the address when the password is wrong', async () => {
            await expect(service.changeUnverifiedEmail('user-1', 'nope', 'ana@nuevo.com')).rejects.toBeInstanceOf(AuthError);

            expect(userRepository.updateUnverifiedEmail).not.toHaveBeenCalled();
            expect(emailService.sendVerifyEmail).not.toHaveBeenCalled();
        });

        it('refuses an address another account already uses', async () => {
            userRepository.findByEmail.mockResolvedValue({ id: 'user-2' });

            await expect(service.changeUnverifiedEmail('user-1', PASSWORD, 'otra@example.com')).rejects.toBeInstanceOf(ConflictError);

            expect(userRepository.updateUnverifiedEmail).not.toHaveBeenCalled();
        });

        it('refuses to change an email that is already confirmed', async () => {
            userRepository.getUserById.mockResolvedValue(makeUser({ password: passwordHash, isEmailVerified: () => true }));

            await expect(service.changeUnverifiedEmail('user-1', PASSWORD, 'ana@nuevo.com')).rejects.toBeInstanceOf(ConflictError);

            expect(userRepository.updateUnverifiedEmail).not.toHaveBeenCalled();
        });

        it('leaves the address alone, and only sends the link again, when it is the same one', async () => {
            userRepository.findByEmail.mockResolvedValue({ id: 'user-1' });

            await service.changeUnverifiedEmail('user-1', PASSWORD, 'ANA@example.com');

            expect(userRepository.updateUnverifiedEmail).not.toHaveBeenCalled();
            expect(emailService.sendVerifyEmail).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' }));
        });

        it('leaves a trace of the change without keeping either address', async () => {
            await service.changeUnverifiedEmail('user-1', PASSWORD, 'ana@nuevo.com', { ip: '1.2.3.4', userAgent: 'UA' });

            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                actorId: 'user-1', action: AUDIT_EVENTS.EMAIL_CHANGED, ipAddress: '1.2.3.4', userAgent: 'UA',
            }));
            expect(JSON.stringify(auditLogService.log.mock.calls)).not.toContain('nuevo.com');
        });
    });
});
