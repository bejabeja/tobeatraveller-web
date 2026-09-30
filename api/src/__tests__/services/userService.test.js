import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

import bcrypt from 'bcrypt';
import { User } from '../../models/user.js';
import { UserService } from '../../services/userService.js';
import { AuthError } from '../../errors/AuthError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { AUDIT_EVENTS } from '../../utils/auditEvents.js';

const makeUser = (overrides = {}) => new User({
    id: 'user-1',
    username: 'jane',
    email: 'jane@example.com',
    password: 'hashed',
    location: 'Madrid',
    ...overrides,
});

describe('UserService.getUserById()', () => {
    let service;
    let userRepository;
    let itinerariesRepository;
    let followRepository;
    let subscriptionRepository;

    beforeEach(() => {
        userRepository = { getUserById: async () => makeUser() };
        itinerariesRepository = { findPublicByUserId: async () => [], findActiveByUserId: async () => null };
        followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        subscriptionRepository = { hasAnySubscription: async () => false };
        service = new UserService(
            userRepository, itinerariesRepository, followRepository, null,
            null, null, null, null, null, null, subscriptionRepository
        );
    });

    it('includes the email when the requester is viewing their own profile', async () => {
        const result = await service.getUserById('user-1', 'user-1');

        expect(result.email).toBe('jane@example.com');
    });

    it('omits the email when the requester is someone else (or anonymous)', async () => {
        const result = await service.getUserById('user-1', 'someone-else');

        expect(result.email).toBeUndefined();
    });

    it('omits the email for an anonymous request', async () => {
        const result = await service.getUserById('user-1', undefined);

        expect(result.email).toBeUndefined();
    });

    it('sets activeTrip to null when the user has no trip in progress', async () => {
        const result = await service.getUserById('user-1', 'user-1');

        expect(result.activeTrip).toBeNull();
    });

    it('includes the in-progress trip as activeTrip', async () => {
        itinerariesRepository.findActiveByUserId = async () => ({
            toSimpleDTO: () => ({ id: 'trip-1', title: 'Roman holiday' }),
        });

        const result = await service.getUserById('user-1', 'user-1');

        expect(result.activeTrip).toEqual({ id: 'trip-1', title: 'Roman holiday' });
    });

    it('marks isTrialEligible true when the user has never had a subscription', async () => {
        subscriptionRepository.hasAnySubscription = async () => false;

        const result = await service.getUserById('user-1', 'user-1');

        expect(result.isTrialEligible).toBe(true);
    });

    it('marks isTrialEligible false when the user already had a subscription, so they cannot repeat the free trial', async () => {
        subscriptionRepository.hasAnySubscription = async () => true;

        const result = await service.getUserById('user-1', 'user-1');

        expect(result.isTrialEligible).toBe(false);
    });

    it('defaults isTrialEligible to false when no subscriptionRepository is wired, instead of advertising an unverifiable trial', async () => {
        service = new UserService(userRepository, itinerariesRepository, followRepository);

        const result = await service.getUserById('user-1', 'user-1');

        expect(result.isTrialEligible).toBe(false);
    });

    it('does not expose isTrialEligible when viewing someone else\'s profile', async () => {
        const result = await service.getUserById('user-1', 'someone-else');

        expect(result.isTrialEligible).toBeUndefined();
    });

    it('does not query subscription eligibility when viewing someone else\'s profile', async () => {
        let called = false;
        subscriptionRepository.hasAnySubscription = async () => { called = true; return false; };

        await service.getUserById('user-1', 'someone-else');

        expect(called).toBe(false);
    });
});

describe('UserService.deleteUser()', () => {
    let service;
    let userRepository;
    let itinerariesRepository;
    let lifeDiaryRepository;

    beforeEach(() => {
        userRepository = { getUserById: async () => makeUser(), deleteUser: async () => {} };
        itinerariesRepository = { findImagePublicIdsByUserId: async () => ['cover-1', 'gallery-1'] };
        lifeDiaryRepository = { findImagePublicIdsByUserId: async () => ['diary-1'] };
        service = new UserService(userRepository, itinerariesRepository, {}, null, lifeDiaryRepository);
    });

    it('throws NotFoundError when the user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(service.deleteUser('missing')).rejects.toThrow('User not found');
    });

    // Regression: deleting the account left the Stripe subscription running, so
    // someone with Premium kept being charged with no account to see it in.
    describe('billing', () => {
        const buildWithBilling = (billingService) => new UserService(
            userRepository, itinerariesRepository, {}, null, lifeDiaryRepository,
            null, null, null, null, null, null, null, null, null, null, null, billingService
        );

        it('closes the billing account before deleting the user', async () => {
            const calls = [];
            const user = makeUser({ stripeCustomerId: 'cus_123' });
            userRepository.getUserById = async () => user;
            userRepository.deleteUser = async () => { calls.push('deleteUser'); };
            const billingService = { closeBillingAccount: async () => { calls.push('closeBillingAccount'); } };

            await buildWithBilling(billingService).deleteUser('user-1');

            expect(calls).toEqual(['closeBillingAccount', 'deleteUser']);
        });

        it('does not delete the account when the billing could not be closed, so the user is not left paying with no way to cancel', async () => {
            const deleteUser = vi.fn();
            userRepository.deleteUser = deleteUser;
            const billingService = { closeBillingAccount: async () => { throw new Error('stripe down'); } };

            await expect(buildWithBilling(billingService).deleteUser('user-1')).rejects.toThrow('stripe down');

            expect(deleteUser).not.toHaveBeenCalled();
        });
    });

    it('collects the deleted user\'s itinerary and life diary image public ids', async () => {
        const result = await service.deleteUser('user-1');

        expect(result.user.id).toBe('user-1');
        expect(result.imagePublicIds).toEqual(['cover-1', 'gallery-1', 'diary-1']);
    });

    it('also collects the van log receipt photo public ids so they are not orphaned in storage', async () => {
        const vanLogRepository = { findReceiptPublicIdsByUserId: async () => ['receipt-1'] };
        service = new UserService(userRepository, itinerariesRepository, {}, null, lifeDiaryRepository, null, vanLogRepository);

        const result = await service.deleteUser('user-1');

        expect(result.imagePublicIds).toEqual(['cover-1', 'gallery-1', 'diary-1', 'receipt-1']);
    });

    it('collects itinerary images even when no lifeDiaryRepository is wired', async () => {
        service = new UserService(userRepository, itinerariesRepository, {});

        const result = await service.deleteUser('user-1');

        expect(result.imagePublicIds).toEqual(['cover-1', 'gallery-1']);
    });

    it('gathers image ids before deleting the user, so the cascade can\'t remove them first', async () => {
        const callOrder = [];
        itinerariesRepository.findImagePublicIdsByUserId = async () => { callOrder.push('collect'); return []; };
        userRepository.deleteUser = async () => { callOrder.push('delete'); };

        await service.deleteUser('user-1');

        expect(callOrder).toEqual(['collect', 'delete']);
    });

    it('logs the deletion when an admin deletes someone else\'s account', async () => {
        let loggedEntry;
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        service = new UserService(userRepository, itinerariesRepository, {}, null, lifeDiaryRepository, auditLogService);

        await service.deleteUser('user-1', { id: 'admin-1', username: 'root' });

        expect(loggedEntry).toEqual({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: AUDIT_EVENTS.ACCOUNT_DELETED_BY_ADMIN,
            targetUserId: 'user-1',
            targetUsername: 'jane',
        });
    });

    it('logs a self-delete under a different action than an admin-initiated one', async () => {
        let loggedEntry;
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        service = new UserService(userRepository, itinerariesRepository, {}, null, lifeDiaryRepository, auditLogService);

        await service.deleteUser('user-1', { id: 'user-1', username: 'jane' });

        expect(loggedEntry.action).toBe(AUDIT_EVENTS.ACCOUNT_DELETED_BY_SELF);
    });

    it('forwards the caller\'s ip and user agent to the log', async () => {
        let loggedEntry;
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        service = new UserService(userRepository, itinerariesRepository, {}, null, lifeDiaryRepository, auditLogService);

        await service.deleteUser('user-1', { id: 'admin-1', username: 'root' }, { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' });

        expect(loggedEntry.ipAddress).toBe('203.0.113.1');
        expect(loggedEntry.userAgent).toBe('Mozilla/5.0');
    });
});

describe('UserService.updateUserRole()', () => {
    let service;
    let userRepository;
    let auditLogService;

    beforeEach(() => {
        userRepository = {
            getUserById: async (id) => makeUser({ id, role: 'user' }),
            updateRole: async (id, role) => makeUser({ id, role }),
        };
        auditLogService = { log: () => {} };
        service = new UserService(userRepository, {}, {}, null, null, auditLogService);
    });

    it('updates the target user role when a superadmin grants superadmin', async () => {
        const result = await service.updateUserRole('user-2', 'superadmin', { id: 'admin-1', role: 'superadmin' });

        expect(result.role).toBe('superadmin');
    });

    it('throws ForbiddenError when a plain admin tries to grant superadmin', async () => {
        await expect(
            service.updateUserRole('user-2', 'superadmin', { id: 'admin-1', role: 'admin' })
        ).rejects.toThrow('Only a superadmin can grant the superadmin role');
    });

    it('throws ForbiddenError when an admin tries to change their own role', async () => {
        await expect(
            service.updateUserRole('admin-1', 'user', { id: 'admin-1', role: 'admin' })
        ).rejects.toThrow('You cannot change your own role');
    });

    it('throws NotFoundError when the target user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(
            service.updateUserRole('missing', 'admin', { id: 'admin-1', role: 'superadmin' })
        ).rejects.toThrow('User not found');
    });

    it('logs the role change with the previous and new role', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };

        await service.updateUserRole('user-2', 'admin', { id: 'admin-1', username: 'root', role: 'superadmin' });

        expect(loggedEntry).toEqual({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: AUDIT_EVENTS.ROLE_UPDATED,
            targetUserId: 'user-2',
            targetUsername: 'jane',
            metadata: { previousRole: 'user', newRole: 'admin' },
        });
    });

    it('forwards the caller\'s ip and user agent to the log', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };

        await service.updateUserRole(
            'user-2', 'admin', { id: 'admin-1', username: 'root', role: 'superadmin' },
            { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' }
        );

        expect(loggedEntry.ipAddress).toBe('203.0.113.1');
        expect(loggedEntry.userAgent).toBe('Mozilla/5.0');
    });
});

describe('UserService.sendAdminNotice()', () => {
    let service;
    let userRepository;
    let notificationsService;
    let auditLogService;

    beforeEach(() => {
        userRepository = { getUserById: async (id) => makeUser({ id, username: 'jane' }) };
        notificationsService = { createNotification: vi.fn().mockResolvedValue(true) };
        auditLogService = { log: vi.fn() };
        service = new UserService(
            userRepository, {}, {}, null, null, auditLogService,
            null, null, null, null, null, null, null, null, null, notificationsService
        );
    });

    it('throws ForbiddenError when an admin tries to send themselves a notice', async () => {
        await expect(
            service.sendAdminNotice('admin-1', 'hello', { id: 'admin-1', username: 'root' })
        ).rejects.toThrow('You cannot send yourself a notice');

        expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the target user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(
            service.sendAdminNotice('missing', 'hello', { id: 'admin-1', username: 'root' })
        ).rejects.toThrow('User not found');
    });

    it('throws when the notification was not actually delivered, without logging it as sent', async () => {
        notificationsService.createNotification.mockResolvedValue(false);

        await expect(
            service.sendAdminNotice('user-2', 'hello', { id: 'admin-1', username: 'root' })
        ).rejects.toThrow('Failed to send the notice');

        expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('creates an admin_notice notification for the target user', async () => {
        await service.sendAdminNotice('user-2', 'Please review your trip', { id: 'admin-1', username: 'root' });

        expect(notificationsService.createNotification).toHaveBeenCalledWith({
            userId: 'user-2',
            actorId: 'admin-1',
            type: 'admin_notice',
            message: 'Please review your trip',
        });
    });

    it('logs the notice with the message in the audit metadata', async () => {
        await service.sendAdminNotice(
            'user-2', 'Please review your trip', { id: 'admin-1', username: 'root' },
            { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' }
        );

        expect(auditLogService.log).toHaveBeenCalledWith({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: AUDIT_EVENTS.ADMIN_NOTICE_SENT,
            targetUserId: 'user-2',
            targetUsername: 'jane',
            metadata: { message: 'Please review your trip' },
            ipAddress: '203.0.113.1',
            userAgent: 'Mozilla/5.0',
        });
    });
});

describe('UserService.updateUserTier()', () => {
    let service;
    let userRepository;
    let auditLogService;

    beforeEach(() => {
        userRepository = {
            getUserById: async (id) => makeUser({ id, premiumUntil: null }),
            updatePremiumUntil: async (id, premiumUntil) => makeUser({ id, premiumUntil }),
        };
        auditLogService = { log: () => {} };
        service = new UserService(userRepository, {}, {}, null, null, auditLogService);
    });

    it('grants a far-future premiumUntil when moving a free user to premium', async () => {
        const result = await service.updateUserTier('user-2', { tier: 'premium' }, { id: 'admin-1', username: 'root' });

        expect(result.isPremium()).toBe(true);
        expect(result.premiumUntil.getFullYear()).toBeGreaterThan(new Date().getFullYear() + 50);
    });

    it('clears premiumUntil when moving a premium user to free', async () => {
        userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: new Date('2099-01-01') });

        const result = await service.updateUserTier('user-2', { tier: 'free' }, { id: 'admin-1', username: 'root' });

        expect(result.isPremium()).toBe(false);
    });

    it('throws NotFoundError when the target user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(
            service.updateUserTier('missing', { tier: 'premium' }, { id: 'admin-1', username: 'root' })
        ).rejects.toThrow('User not found');
    });

    it('logs the tier change with the previous and new tier', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };
        userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: null });

        await service.updateUserTier('user-2', { tier: 'premium' }, { id: 'admin-1', username: 'root' });

        expect(loggedEntry).toEqual({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: AUDIT_EVENTS.TIER_UPDATED,
            targetUserId: 'user-2',
            targetUsername: 'jane',
            metadata: { previousTier: 'free', newTier: 'premium', months: null, premiumUntil: expect.any(Date), keptPaidSubscription: false },
        });
    });

    it('gifts premium for the months chosen', async () => {
        const result = await service.updateUserTier('user-2', { tier: 'premium', months: 3 }, { id: 'admin-1', username: 'root' });

        const inThreeMonths = new Date();
        inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
        expect(Math.abs(result.premiumUntil - inThreeMonths)).toBeLessThan(60_000);
    });

    // Regression: a short gift replaced the premium they already had.
    it('never shortens the premium they already have with a shorter gift', async () => {
        const earnedUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: earnedUntil });

        const result = await service.updateUserTier('user-2', { tier: 'premium', months: 1 }, { id: 'admin-1', username: 'root' });

        expect(result.premiumUntil).toEqual(earnedUntil);
    });

    describe('for someone paying through Stripe', () => {
        const paidUntil = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);

        beforeEach(() => {
            userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: paidUntil });
            service = new UserService(
                userRepository, {}, {}, null, null, auditLogService, null, null, null, null,
                { findByUserId: async () => [
                    { status: 'active', currentPeriodEnd: paidUntil },
                    { status: 'canceled', currentPeriodEnd: new Date('2099-01-01') },
                ] },
            );
        });

        it('never shortens what they paid for with a shorter gift', async () => {
            const result = await service.updateUserTier('user-2', { tier: 'premium', months: 1 }, { id: 'admin-1', username: 'root' });

            expect(result.premiumUntil).toEqual(paidUntil);
        });

        // Regression: taking premium away cleared it, cutting off a period
        // the user had already paid for.
        it('leaves them premium until the paid period ends when premium is taken away', async () => {
            const result = await service.updateUserTier('user-2', { tier: 'free' }, { id: 'admin-1', username: 'root' });

            expect(result.premiumUntil).toEqual(paidUntil);
            expect(result.isPremium()).toBe(true);
        });
    });

    it('forwards the caller\'s ip and user agent to the log', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };

        await service.updateUserTier(
            'user-2', { tier: 'premium' }, { id: 'admin-1', username: 'root' },
            { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' }
        );

        expect(loggedEntry.ipAddress).toBe('203.0.113.1');
        expect(loggedEntry.userAgent).toBe('Mozilla/5.0');
    });
});

describe('UserService.create()', () => {
    let userRepository;
    let service;

    beforeEach(() => {
        userRepository = {
            findByName: async () => null,
            findByEmail: async () => null,
            isReferralCodeTakenByOther: async () => false,
            save: async (user) => makeUser(user),
        };
        service = new UserService(userRepository, { findPublicByUserId: async () => [] }, {});
    });

    // Regression: a name someone had before (and still their invite code)
    // could be taken, and the signup then failed on the duplicate code.
    it("rejects a username that is still someone else's invite code", async () => {
        userRepository.isReferralCodeTakenByOther = vi.fn().mockResolvedValue(true);

        await expect(service.create({ username: 'Ana', email: 'x@example.com', password: 'secret1' }))
            .rejects.toBeInstanceOf(ConflictError);
        expect(userRepository.isReferralCodeTakenByOther).toHaveBeenCalledWith('ana', null);
    });

    it('resolves the signup country from the request IP', async () => {
        let savedUser;
        userRepository.save = async (user) => { savedUser = user; return makeUser(user); };

        await service.create(
            { username: 'jane', email: 'jane@example.com', password: 'secret1' },
            { ip: '8.8.8.8', userAgent: 'Mozilla/5.0 (test)' }
        );

        expect(savedUser.signupCountryCode).toBe('US');
        expect(savedUser.signupUserAgent).toBe('Mozilla/5.0 (test)');
    });

    it('keeps the language the user signed up in, and welcomes them in it', async () => {
        let savedUser;
        userRepository.save = async (user) => { savedUser = user; return makeUser(user); };
        const emailService = { sendWelcome: vi.fn().mockResolvedValue(undefined) };
        service = new UserService(userRepository, { findPublicByUserId: async () => [] }, {}, emailService);

        await service.create({ username: 'jane', email: 'jane@example.com', password: 'secret1', language: 'es' });

        expect(savedUser.language).toBe('es');
        expect(emailService.sendWelcome).toHaveBeenCalledWith({ username: 'jane', email: 'jane@example.com', language: 'es' });
    });

    // Signing up from an older app that doesn't send it.
    it('leaves the language unknown when the signup does not say it', async () => {
        let savedUser;
        userRepository.save = async (user) => { savedUser = user; return makeUser(user); };

        await service.create({ username: 'jane', email: 'jane@example.com', password: 'secret1' });

        expect(savedUser.language).toBeNull();
    });

    it('stores null signup metadata when no request context is given', async () => {
        let savedUser;
        userRepository.save = async (user) => { savedUser = user; return makeUser(user); };

        await service.create({ username: 'jane', email: 'jane@example.com', password: 'secret1' });

        expect(savedUser.signupCountryCode).toBeNull();
        expect(savedUser.signupUserAgent).toBeNull();
    });

    describe('referral registration', () => {
        let referralService;
        let serviceWithReferral;

        beforeEach(() => {
            referralService = {
                registerSignup: vi.fn().mockResolvedValue(undefined),
                codeFromUsername: vi.fn((username) => username.toLowerCase()),
            };
            serviceWithReferral = new UserService(
                userRepository, { findPublicByUserId: async () => [] }, {}, null,
                null, null, null, null, null, null, null, referralService
            );
        });

        it("derives the new user's own referral code from their username", async () => {
            let savedUser;
            userRepository.save = async (user) => { savedUser = user; return makeUser(user); };

            await serviceWithReferral.create({ username: 'JaneDoe', email: 'jane@example.com', password: 'secret1' });

            expect(savedUser.referralCode).toBe('janedoe');
        });

        it('registers the referral with the new user id once signup succeeds', async () => {
            await serviceWithReferral.create({
                username: 'jane', email: 'jane@example.com', password: 'secret1', referralCode: 'abc123',
            });

            expect(referralService.registerSignup).toHaveBeenCalledWith('abc123', 'user-1');
        });

        it('does not attempt to register a referral when no code was provided', async () => {
            await serviceWithReferral.create({ username: 'jane', email: 'jane@example.com', password: 'secret1' });

            expect(referralService.registerSignup).not.toHaveBeenCalled();
        });

        it('does not let a failing referral registration break signup', async () => {
            referralService.registerSignup.mockRejectedValue(new Error('db down'));

            await expect(serviceWithReferral.create({
                username: 'jane', email: 'jane@example.com', password: 'secret1', referralCode: 'abc123',
            })).resolves.toBeDefined();
        });
    });
});

describe('UserService.exportUserData()', () => {
    it('logs a data_exported event for the requesting user, a GDPR data-subject request', async () => {
        let loggedEntry;
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        const service = new UserService(userRepository, itinerariesRepository, followRepository, null, null, auditLogService);

        await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(loggedEntry).toEqual({
            actorId: 'user-1', actorUsername: 'jane',
            action: AUDIT_EVENTS.DATA_EXPORTED, targetUserId: 'user-1', targetUsername: 'jane',
        });
    });

    it('forwards the caller\'s ip and user agent to the log', async () => {
        let loggedEntry;
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        const service = new UserService(userRepository, itinerariesRepository, followRepository, null, null, auditLogService);

        await service.exportUserData('user-1', { id: 'user-1', username: 'jane' }, { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' });

        expect(loggedEntry.ipAddress).toBe('203.0.113.1');
        expect(loggedEntry.userAgent).toBe('Mozilla/5.0');
    });

    // Regression: data_exported used to be logged before the export data was
    // actually assembled, so a failure here still left a false "succeeded"
    // record in the audit trail.
    it('does not log data_exported when assembling the export data fails', async () => {
        let loggedEntry;
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => { throw new Error('db down'); } };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        const service = new UserService(userRepository, itinerariesRepository, followRepository, null, null, auditLogService);

        await expect(
            service.exportUserData('user-1', { id: 'user-1', username: 'jane' })
        ).rejects.toThrow('db down');

        expect(loggedEntry).toBeUndefined();
    });

    // Regression: the export used to omit van-log, supplies, packing-checklist,
    // and life-diary content entirely, so a GDPR data-portability request
    // (the "Download data" button) didn't actually return everything the user
    // had created in the app.
    it('includes van-log, supplies, packing-checklist, and life-diary (with images) content', async () => {
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const lifeDiaryRepository = {
            findByUserId: async () => [{ id: 'entry-1', images: [], toDTO() { return { id: this.id, images: this.images }; } }],
            getImagesByEntryIds: async () => [{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cloudinary/img.jpg' }],
        };
        const vanLogRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'van-1' }) }] };
        const inventoryRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'inv-1' }) }] };
        const shoppingListRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'shop-1' }) }] };
        const packingChecklistRepository = { findByUserId: async () => [{ listId: 'list-1', toDTO: () => ({ id: 'pack-1' }) }] };
        const packingListRepository = { findByUserId: async () => [{ id: 'list-1', toDTO: () => ({ id: 'list-1', name: 'Invierno' }) }] };
        const service = new UserService(
            userRepository, itinerariesRepository, followRepository, null,
            lifeDiaryRepository, null, vanLogRepository,
            inventoryRepository, shoppingListRepository, packingChecklistRepository,
            null, null, null, null, packingListRepository
        );

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.vanLogEntries).toEqual([{ id: 'van-1' }]);
        expect(result.supplies).toEqual({ inventory: [{ id: 'inv-1' }], shoppingList: [{ id: 'shop-1' }] });
        expect(result.packingLists).toEqual([{ id: 'list-1', name: 'Invierno', items: [{ id: 'pack-1' }] }]);
        expect(result.lifeDiaryEntries).toEqual([{
            id: 'entry-1', images: [{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cloudinary/img.jpg' }],
        }]);
    });

    it('includes the subscription and premium data, part of what a data-subject request covers', async () => {
        const premiumUntil = new Date('2030-01-01T00:00:00.000Z');
        const userRepository = {
            getUserById: async () => makeUser({ premiumUntil, stripeCustomerId: 'cus_123' }),
            findRetiredReferralCodes: async () => [],
        };
        const subscriptionRepository = {
            findByUserId: async () => [{
                stripeSubscriptionId: 'sub_1', status: 'active', currentPeriodEnd: premiumUntil,
                cancelAtPeriodEnd: false, createdAt: new Date('2029-01-01T00:00:00.000Z'),
            }],
        };
        const service = new UserService(
            userRepository, { findByUserId: async () => [] }, { getFollowers: async () => [], getFollowing: async () => [] },
            null, null, null, null, null, null, null, subscriptionRepository
        );

        const { billing } = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(billing).toEqual({
            stripeCustomerId: 'cus_123',
            premiumUntil,
            subscriptions: [{
                stripeSubscriptionId: 'sub_1', status: 'active', currentPeriodEnd: premiumUntil,
                cancelAtPeriodEnd: false, startedAt: new Date('2029-01-01T00:00:00.000Z'),
            }],
        });
    });

    it('exports an empty billing section for someone who never subscribed', async () => {
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const service = new UserService(userRepository, { findByUserId: async () => [] }, { getFollowers: async () => [], getFollowing: async () => [] });

        const { billing } = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(billing.subscriptions).toEqual([]);
    });

    it('omits van-log, supplies, packing-checklist, and life-diary content when those repositories are not wired', async () => {
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const service = new UserService(userRepository, itinerariesRepository, followRepository);

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.vanLogEntries).toEqual([]);
        expect(result.supplies).toEqual({ inventory: [], shoppingList: [] });
        expect(result.packingLists).toEqual([]);
        expect(result.lifeDiaryEntries).toEqual([]);
    });

    it('includes the devices registered for push notifications', async () => {
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const pushDevice = { token: 'ExponentPushToken[a]', platform: 'android', locale: 'es' };
        const pushTokensRepository = { findByUserId: async () => [pushDevice] };
        const service = new UserService(
            userRepository, itinerariesRepository, followRepository,
            null, null, null, null, null, null, null, null, null, pushTokensRepository
        );

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.pushDevices).toEqual([pushDevice]);
    });

    it('includes the badges the user has earned and the countries in their passport, stamped and declared', async () => {
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => [] };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const earned = [{ badgeId: 'explorer', earnedAt: new Date('2026-09-01') }];
        const countryStamps = [{ countryCode: 'ES', stampedAt: new Date('2026-09-02') }];
        const declaredCountries = [{ countryCode: 'JP', declaredAt: new Date('2026-09-03') }];
        const badgeRepository = {
            findEarnedByUserId: async () => earned,
            findStampedCountries: async () => countryStamps,
            findDeclaredCountries: async () => declaredCountries,
        };
        const service = new UserService(
            userRepository, itinerariesRepository, followRepository,
            null, null, null, null, null, null, null, null, null, null, badgeRepository
        );

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.badges).toEqual(earned);
        expect(result.countryStamps).toEqual(countryStamps);
        expect(result.declaredCountries).toEqual(declaredCountries);
    });

    it('includes the earlier invite codes still kept after a change of username', async () => {
        const retired = [{ code: 'jane_old', retiredAt: '2026-03-01T00:00:00Z' }];
        const userRepository = { getUserById: async () => makeUser(), findRetiredReferralCodes: async () => retired };
        const service = new UserService(
            userRepository, { findByUserId: async () => [] }, { getFollowers: async () => [], getFollowing: async () => [] }
        );

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.profile.previousReferralCodes).toEqual(retired);
    });
});


describe('UserService.changePassword()', () => {
    let service;
    let userRepository;
    let hashedCurrentPassword;

    beforeEach(async () => {
        hashedCurrentPassword = await bcrypt.hash('correct-password', 10);
        userRepository = {
            getUserById: async () => makeUser({ password: hashedCurrentPassword }),
            updatePassword: vi.fn().mockResolvedValue(undefined),
        };
        service = new UserService(userRepository, {}, {});
    });

    it('throws NotFoundError when the user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(service.changePassword('user-1', 'correct-password', 'new-password'))
            .rejects.toThrow(NotFoundError);
    });

    it('throws AuthError when the current password is incorrect', async () => {
        await expect(service.changePassword('user-1', 'wrong-password', 'new-password'))
            .rejects.toThrow(AuthError);

        expect(userRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('stores a new bcrypt hash of the new password when the current password is correct', async () => {
        await service.changePassword('user-1', 'correct-password', 'new-password');

        expect(userRepository.updatePassword).toHaveBeenCalledTimes(1);
        const [id, storedHash] = userRepository.updatePassword.mock.calls[0];
        expect(id).toBe('user-1');
        expect(storedHash).not.toBe('new-password');
        await expect(bcrypt.compare('new-password', storedHash)).resolves.toBe(true);
    });

    it('logs a password_changed event for the acting user', async () => {
        let loggedEntry;
        const auditLogService = { log: (entry) => { loggedEntry = entry; } };
        service = new UserService(userRepository, {}, {}, null, null, auditLogService);

        await service.changePassword('user-1', 'correct-password', 'new-password', { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' });

        expect(loggedEntry).toEqual({
            actorId: 'user-1', actorUsername: 'jane', action: AUDIT_EVENTS.PASSWORD_CHANGED,
            ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0',
        });
    });

    it('sends a password-changed confirmation email to the account owner, in their language', async () => {
        userRepository.getUserById = async () => makeUser({ password: hashedCurrentPassword, language: 'es' });
        const emailService = { sendPasswordChanged: vi.fn().mockResolvedValue(undefined) };
        service = new UserService(userRepository, {}, {}, emailService);

        await service.changePassword('user-1', 'correct-password', 'new-password');

        expect(emailService.sendPasswordChanged).toHaveBeenCalledWith({ username: 'jane', email: 'jane@example.com', language: 'es' });
    });

    // Regression: a rejected fire-and-forget email send must not surface as a
    // failure of the password change itself, the same guarantee sendWelcome/
    // sendAccountDeleted already rely on elsewhere in this service.
    it('does not fail the password change when sending the confirmation email rejects', async () => {
        const emailService = { sendPasswordChanged: vi.fn().mockRejectedValue(new Error('brevo down')) };
        service = new UserService(userRepository, {}, {}, emailService);

        await expect(service.changePassword('user-1', 'correct-password', 'new-password')).resolves.toBeUndefined();
    });
});

describe('UserService.updateLanguage()', () => {
    it('saves the language the user now uses the app in', async () => {
        const userRepository = { updateLanguage: vi.fn().mockResolvedValue(undefined) };
        const service = new UserService(userRepository, {}, {});

        await service.updateLanguage('user-1', 'es');

        expect(userRepository.updateLanguage).toHaveBeenCalledWith('user-1', 'es');
    });
});

describe('UserService.deleteUser() email', () => {
    it('confirms the deletion in the language of the deleted account', async () => {
        const userRepository = {
            getUserById: async () => makeUser({ language: 'es' }),
            deleteUser: vi.fn().mockResolvedValue(undefined),
        };
        const itinerariesRepository = { findImagePublicIdsByUserId: async () => [] };
        const emailService = { sendAccountDeleted: vi.fn().mockResolvedValue(undefined) };
        const service = new UserService(userRepository, itinerariesRepository, {}, emailService);

        await service.deleteUser('user-1');

        expect(emailService.sendAccountDeleted).toHaveBeenCalledWith({ username: 'jane', email: 'jane@example.com', language: 'es' });
    });
});

describe('UserService.getFeaturedUsers()', () => {
    const makeService = (users) => {
        const userRepository = { getFeaturedUsers: vi.fn().mockResolvedValue(users) };
        const itinerariesRepository = { getTotalByUserId: vi.fn().mockResolvedValue(2), findLastByUserId: vi.fn().mockResolvedValue(null) };
        return { service: new UserService(userRepository, itinerariesRepository, {}), userRepository };
    };

    it('asks for suggestions for the signed-in viewer', async () => {
        const { service, userRepository } = makeService([makeUser({ id: 'user-2' })]);

        await service.getFeaturedUsers('viewer-1');

        expect(userRepository.getFeaturedUsers).toHaveBeenCalledWith('viewer-1');
    });

    // Following everyone suggested is a normal state, not a missing resource.
    it('returns an empty list, not an error, when nobody is left to suggest', async () => {
        const { service } = makeService([]);

        await expect(service.getFeaturedUsers('viewer-1')).resolves.toEqual([]);
    });
});

describe('UserService.getUserByUsername()', () => {
    const makeService = (found) => {
        const userRepository = { findByName: vi.fn().mockResolvedValue(found), getUserById: vi.fn().mockResolvedValue(found) };
        const itinerariesRepository = { findPublicByUserId: async () => [], findActiveByUserId: async () => null };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const subscriptionRepository = { hasAnySubscription: async () => false };
        return new UserService(userRepository, itinerariesRepository, followRepository, null, null, null, null, null, null, null, subscriptionRepository);
    };

    it('returns the same public profile as by id, without the email', async () => {
        const service = makeService(makeUser());

        const result = await service.getUserByUsername('Jane', 'someone-else');

        expect(result.id).toBe('user-1');
        expect(result.email).toBeUndefined();
    });

    it('throws NotFoundError when nobody has that name', async () => {
        const service = makeService(null);

        await expect(service.getUserByUsername('nobody', null)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('UserService.updateUser() and the invite code', () => {
    const makeService = (overrides = {}) => {
        const userRepository = {
            findByName: async () => null,
            isReferralCodeTakenByOther: async () => false,
            getUserById: async () => makeUser(),
            updateUser: async (id, user) => user,
            ...overrides,
        };
        const referralService = { changeCodeForUsername: vi.fn().mockResolvedValue(undefined) };
        const service = new UserService(userRepository, {}, {}, null, null, null, null, null, null, null, null, referralService);
        return { service, referralService };
    };

    it('moves the invite code to the new name after a change of username', async () => {
        const { service, referralService } = makeService();

        await service.updateUser('user-1', { username: 'jane_vanlife' });

        expect(referralService.changeCodeForUsername).toHaveBeenCalledWith('user-1', 'jane_vanlife');
    });

    it('leaves the invite code alone when the username stays the same', async () => {
        const { service, referralService } = makeService();

        await service.updateUser('user-1', { username: 'jane', bio: 'New bio' });

        expect(referralService.changeCodeForUsername).not.toHaveBeenCalled();
    });

    it("refuses a new name that is still someone else's earlier code", async () => {
        const { service, referralService } = makeService({ isReferralCodeTakenByOther: async () => true });

        await expect(service.updateUser('user-1', { username: 'ana' })).rejects.toBeInstanceOf(ConflictError);
        expect(referralService.changeCodeForUsername).not.toHaveBeenCalled();
    });
});

describe('UserService.isUsernameAvailable()', () => {
    it("says a name is taken while it is still someone's earlier code", async () => {
        const userRepository = { findByName: async () => null, isReferralCodeTakenByOther: vi.fn().mockResolvedValue(true) };
        const service = new UserService(userRepository, {}, {});

        await expect(service.isUsernameAvailable('Ana')).resolves.toBe(false);
        expect(userRepository.isReferralCodeTakenByOther).toHaveBeenCalledWith('ana', null);
    });
});

describe('UserService.updateUser() limits username changes', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const makeService = (usernameChangedAt) => {
        const userRepository = {
            findByName: async () => null,
            isReferralCodeTakenByOther: async () => false,
            getUserById: async () => makeUser({ usernameChangedAt }),
            updateUser: vi.fn(async (id, user) => user),
        };
        const service = new UserService(userRepository, {}, {}, null, null, null, null, null, null, null, null,
            { changeCodeForUsername: async () => {} });
        return { service, userRepository };
    };

    it('allows the first change of username', async () => {
        const { service, userRepository } = makeService(null);

        await service.updateUser('user-1', { username: 'jane_vanlife' });

        expect(userRepository.updateUser).toHaveBeenCalled();
    });

    it('throws ConflictError when the name changed less than 30 days ago', async () => {
        const { service, userRepository } = makeService(new Date(Date.now() - 10 * DAY_MS));

        await expect(service.updateUser('user-1', { username: 'jane_vanlife' })).rejects.toBeInstanceOf(ConflictError);
        expect(userRepository.updateUser).not.toHaveBeenCalled();
    });

    it('allows a new change once 30 days have passed', async () => {
        const { service, userRepository } = makeService(new Date(Date.now() - 31 * DAY_MS));

        await service.updateUser('user-1', { username: 'jane_vanlife' });

        expect(userRepository.updateUser).toHaveBeenCalled();
    });

    // Same code and same link: not a change of name.
    it('lets capitals be changed at any time', async () => {
        const { service, userRepository } = makeService(new Date(Date.now() - DAY_MS));

        await service.updateUser('user-1', { username: 'Jane', bio: 'Van life' });

        expect(userRepository.updateUser).toHaveBeenCalled();
    });
});

describe('UserService.updateUser() name checks and audit', () => {
    const makeService = ({ takenAsCode = false } = {}) => {
        const userRepository = {
            findByName: async () => null,
            isReferralCodeTakenByOther: vi.fn().mockResolvedValue(takenAsCode),
            getUserById: async () => makeUser(),
            updateUser: vi.fn(async (id, user) => user),
        };
        const auditLogService = { log: vi.fn() };
        const service = new UserService(userRepository, {}, {}, null, null, auditLogService, null, null, null, null, null,
            { changeCodeForUsername: async () => {} });
        return { service, userRepository, auditLogService };
    };

    // Regression: an unchanged name was checked on every save, so a profile
    // whose name matched someone's reserved earlier code could not be saved.
    it('saves the rest of the profile without checking an unchanged name', async () => {
        const { service, userRepository } = makeService({ takenAsCode: true });

        await service.updateUser('user-1', { username: 'jane', bio: 'Van life' });

        expect(userRepository.isReferralCodeTakenByOther).not.toHaveBeenCalled();
        expect(userRepository.updateUser).toHaveBeenCalled();
    });

    it('records who changed the name, from what to what', async () => {
        const { service, auditLogService } = makeService();

        await service.updateUser('user-1', { username: 'jane_vanlife' }, { ip: '1.2.3.4', userAgent: 'UA' });

        expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: AUDIT_EVENTS.USERNAME_CHANGED,
            targetUserId: 'user-1',
            metadata: { previousUsername: 'jane', newUsername: 'jane_vanlife' },
            ipAddress: '1.2.3.4',
        }));
    });

    it('records nothing when only the bio changes', async () => {
        const { service, auditLogService } = makeService();

        await service.updateUser('user-1', { username: 'jane', bio: 'Van life' });

        expect(auditLogService.log).not.toHaveBeenCalled();
    });
});

describe('UserService.isUsernameAvailable() for the one asking', () => {
    // Regression: "jane" asking for "Jane" (capitals only) got "taken".
    it("counts one's own name, in other capitals, as available", async () => {
        const userRepository = { findByName: async () => makeUser({ id: 'user-1' }), isReferralCodeTakenByOther: vi.fn().mockResolvedValue(false) };
        const service = new UserService(userRepository, {}, {});

        await expect(service.isUsernameAvailable('Jane', 'user-1')).resolves.toBe(true);
        expect(userRepository.isReferralCodeTakenByOther).toHaveBeenCalledWith('jane', 'user-1');
    });

    it("still counts someone else's name as taken", async () => {
        const userRepository = { findByName: async () => makeUser({ id: 'user-2' }), isReferralCodeTakenByOther: async () => false };
        const service = new UserService(userRepository, {}, {});

        await expect(service.isUsernameAvailable('jane', 'user-1')).resolves.toBe(false);
    });
});
