import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

import bcrypt from 'bcrypt';
import { User } from '../../models/user.js';
import { UserService } from '../../services/userService.js';
import { AuthError } from '../../errors/AuthError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
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

    beforeEach(() => {
        userRepository = { getUserById: async () => makeUser() };
        itinerariesRepository = { findPublicByUserId: async () => [], findActiveByUserId: async () => null };
        followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        service = new UserService(userRepository, itinerariesRepository, followRepository);
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

    it('collects the deleted user\'s itinerary and life diary image public ids', async () => {
        const result = await service.deleteUser('user-1');

        expect(result.user.id).toBe('user-1');
        expect(result.imagePublicIds).toEqual(['cover-1', 'gallery-1', 'diary-1']);
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
        const result = await service.updateUserTier('user-2', 'premium', { id: 'admin-1', username: 'root' });

        expect(result.isPremium()).toBe(true);
        expect(result.premiumUntil.getFullYear()).toBeGreaterThan(new Date().getFullYear() + 50);
    });

    it('clears premiumUntil when moving a premium user to free', async () => {
        userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: new Date('2099-01-01') });

        const result = await service.updateUserTier('user-2', 'free', { id: 'admin-1', username: 'root' });

        expect(result.isPremium()).toBe(false);
    });

    it('throws NotFoundError when the target user does not exist', async () => {
        userRepository.getUserById = async () => null;

        await expect(
            service.updateUserTier('missing', 'premium', { id: 'admin-1', username: 'root' })
        ).rejects.toThrow('User not found');
    });

    it('logs the tier change with the previous and new tier', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };
        userRepository.getUserById = async (id) => makeUser({ id, premiumUntil: null });

        await service.updateUserTier('user-2', 'premium', { id: 'admin-1', username: 'root' });

        expect(loggedEntry).toEqual({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: AUDIT_EVENTS.TIER_UPDATED,
            targetUserId: 'user-2',
            targetUsername: 'jane',
            metadata: { previousTier: 'free', newTier: 'premium' },
        });
    });

    it('forwards the caller\'s ip and user agent to the log', async () => {
        let loggedEntry;
        auditLogService.log = (entry) => { loggedEntry = entry; };

        await service.updateUserTier(
            'user-2', 'premium', { id: 'admin-1', username: 'root' },
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
            save: async (user) => makeUser(user),
        };
        service = new UserService(userRepository, { findPublicByUserId: async () => [] }, {});
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

    it('stores null signup metadata when no request context is given', async () => {
        let savedUser;
        userRepository.save = async (user) => { savedUser = user; return makeUser(user); };

        await service.create({ username: 'jane', email: 'jane@example.com', password: 'secret1' });

        expect(savedUser.signupCountryCode).toBeNull();
        expect(savedUser.signupUserAgent).toBeNull();
    });
});

describe('UserService.exportUserData()', () => {
    it('logs a data_exported event for the requesting user, a GDPR data-subject request', async () => {
        let loggedEntry;
        const userRepository = { getUserById: async () => makeUser() };
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
        const userRepository = { getUserById: async () => makeUser() };
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
        const userRepository = { getUserById: async () => makeUser() };
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
        const userRepository = { getUserById: async () => makeUser() };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const lifeDiaryRepository = {
            findByUserId: async () => [{ id: 'entry-1', images: [], toDTO() { return { id: this.id, images: this.images }; } }],
            getImagesByEntryIds: async () => [{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cloudinary/img.jpg' }],
        };
        const vanLogRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'van-1' }) }] };
        const inventoryRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'inv-1' }) }] };
        const shoppingListRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'shop-1' }) }] };
        const packingChecklistRepository = { findByUserId: async () => [{ toDTO: () => ({ id: 'pack-1' }) }] };
        const service = new UserService(
            userRepository, itinerariesRepository, followRepository, null,
            lifeDiaryRepository, null, vanLogRepository,
            inventoryRepository, shoppingListRepository, packingChecklistRepository
        );

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.vanLogEntries).toEqual([{ id: 'van-1' }]);
        expect(result.supplies).toEqual({ inventory: [{ id: 'inv-1' }], shoppingList: [{ id: 'shop-1' }] });
        expect(result.packingChecklist).toEqual([{ id: 'pack-1' }]);
        expect(result.lifeDiaryEntries).toEqual([{
            id: 'entry-1', images: [{ id: 'img-1', entryId: 'entry-1', photoUrl: 'https://cloudinary/img.jpg' }],
        }]);
    });

    it('omits van-log, supplies, packing-checklist, and life-diary content when those repositories are not wired', async () => {
        const userRepository = { getUserById: async () => makeUser() };
        const itinerariesRepository = { findByUserId: async () => [] };
        const followRepository = { getFollowers: async () => [], getFollowing: async () => [] };
        const service = new UserService(userRepository, itinerariesRepository, followRepository);

        const result = await service.exportUserData('user-1', { id: 'user-1', username: 'jane' });

        expect(result.vanLogEntries).toEqual([]);
        expect(result.supplies).toEqual({ inventory: [], shoppingList: [] });
        expect(result.packingChecklist).toEqual([]);
        expect(result.lifeDiaryEntries).toEqual([]);
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

    it('sends a password-changed confirmation email to the account owner', async () => {
        const emailService = { sendPasswordChanged: vi.fn().mockResolvedValue(undefined) };
        service = new UserService(userRepository, {}, {}, emailService);

        await service.changePassword('user-1', 'correct-password', 'new-password');

        expect(emailService.sendPasswordChanged).toHaveBeenCalledWith({ username: 'jane', email: 'jane@example.com' });
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
