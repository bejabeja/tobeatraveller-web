import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../../services/notificationsService.js';

describe('NotificationsService.getNotifications()', () => {
    let service;
    let notificationsRepository;

    beforeEach(() => {
        notificationsRepository = {
            getByUserId: vi.fn().mockResolvedValue([]),
            getTotalCount: vi.fn().mockResolvedValue(0),
        };
        service = new NotificationsService(notificationsRepository);
    });

    it('computes totalPages from totalCount and the page size', async () => {
        notificationsRepository.getTotalCount.mockResolvedValue(45);

        const result = await service.getNotifications('user-1', 1, 20);

        expect(result.totalCount).toBe(45);
        expect(result.totalPages).toBe(3);
        expect(result.currentPage).toBe(1);
    });

    it('returns totalPages of 1 when there are no notifications', async () => {
        notificationsRepository.getTotalCount.mockResolvedValue(0);

        const result = await service.getNotifications('user-1', 1, 20);

        expect(result.totalPages).toBe(1);
    });

    it('passes the correct offset for subsequent pages', async () => {
        await service.getNotifications('user-1', 3, 20);

        expect(notificationsRepository.getByUserId).toHaveBeenCalledWith('user-1', 20, 40);
    });
});

describe('NotificationsService.createNotification()', () => {
    let service;
    let notificationsRepository;

    beforeEach(() => {
        notificationsRepository = {
            create: vi.fn().mockResolvedValue(undefined),
            getPreferences: vi.fn().mockResolvedValue({
                notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true,
            }),
        };
        service = new NotificationsService(notificationsRepository);
    });

    it('creates a badge notification even though the user is their own actor', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u1', type: 'badge_earned', badgeId: 'explorer' });

        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1', type: 'badge_earned', badgeId: 'explorer',
        }));
    });

    it('creates a country stamp notification even though the user is their own actor', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u1', type: 'country_stamp', countryCode: 'IT' });

        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1', type: 'country_stamp', countryCode: 'IT',
        }));
    });

    it('creates a recap notification even though the user is their own actor', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u1', type: 'recap_ready' });

        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', type: 'recap_ready' }));
    });

    it('does not create a notification when the actor is the recipient', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u1', type: 'like' });

        expect(notificationsRepository.getPreferences).not.toHaveBeenCalled();
        expect(notificationsRepository.create).not.toHaveBeenCalled();
    });

    it('skips creating the notification when the recipient disabled that type', async () => {
        notificationsRepository.getPreferences.mockResolvedValue({
            notifyOnComment: true, notifyOnLike: false, notifyOnFollow: true,
        });

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1' });

        expect(notificationsRepository.create).not.toHaveBeenCalled();
    });

    it('creates the notification when the recipient has that type enabled', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(notificationsRepository.create).toHaveBeenCalledWith(
            { userId: 'u1', actorId: 'u2', type: 'follow', itineraryId: undefined, commentId: undefined }
        );
    });
});

describe('NotificationsService.createNotification() push delivery', () => {
    let service;
    let notificationsRepository;
    let pushNotificationsService;

    const preferences = (overrides = {}) => ({
        notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, pushEnabled: true, ...overrides,
    });

    beforeEach(() => {
        notificationsRepository = {
            create: vi.fn().mockResolvedValue({ grouped: false }),
            getPreferences: vi.fn().mockResolvedValue(preferences()),
        };
        pushNotificationsService = { sendNotificationPush: vi.fn().mockResolvedValue() };
        service = new NotificationsService(notificationsRepository, pushNotificationsService);
    });

    it('sends a push for the first like of a grouping window', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1' });

        expect(pushNotificationsService.sendNotificationPush).toHaveBeenCalledWith(
            { userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1', commentId: undefined }
        );
    });

    it('tells the push which badge or country it is about', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u1', type: 'badge_earned', badgeId: 'countries_5' });

        expect(pushNotificationsService.sendNotificationPush).toHaveBeenCalledWith(expect.objectContaining({ badgeId: 'countries_5' }));
    });

    it('does not push a like that folds into an existing notification', async () => {
        notificationsRepository.create.mockResolvedValue({ grouped: true });

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1' });

        expect(pushNotificationsService.sendNotificationPush).not.toHaveBeenCalled();
    });

    it('does not push a follow that folds into an existing notification', async () => {
        notificationsRepository.create.mockResolvedValue({ grouped: true });

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(pushNotificationsService.sendNotificationPush).not.toHaveBeenCalled();
    });

    it('pushes every comment, even when it folds into an existing notification', async () => {
        notificationsRepository.create.mockResolvedValue({ grouped: true });

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'comment', itineraryId: 'i1', commentId: 'c1' });

        expect(pushNotificationsService.sendNotificationPush).toHaveBeenCalledWith(
            { userId: 'u1', actorId: 'u2', type: 'comment', itineraryId: 'i1', commentId: 'c1' }
        );
    });

    it('keeps the in-app notification but skips the push when the recipient turned push off', async () => {
        notificationsRepository.getPreferences.mockResolvedValue(preferences({ pushEnabled: false }));

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'comment', itineraryId: 'i1' });

        expect(notificationsRepository.create).toHaveBeenCalled();
        expect(pushNotificationsService.sendNotificationPush).not.toHaveBeenCalled();
    });

    it('sends no push when the recipient disabled that notification type', async () => {
        notificationsRepository.getPreferences.mockResolvedValue(preferences({ notifyOnLike: false }));

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1' });

        expect(pushNotificationsService.sendNotificationPush).not.toHaveBeenCalled();
    });

    it('sends no push when storing the in-app notification failed', async () => {
        notificationsRepository.create.mockResolvedValue(null);

        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(pushNotificationsService.sendNotificationPush).not.toHaveBeenCalled();
    });

    // Regression: callers fire createNotification with .catch(() => {}), so a
    // push failure escaping here was swallowed with no log at all.
    it('still resolves when sending the push fails, after storing the in-app notification', async () => {
        pushNotificationsService.sendNotificationPush.mockRejectedValue(new Error('Expo down'));

        await expect(
            service.createNotification({ userId: 'u1', actorId: 'u2', type: 'follow' })
        ).resolves.toBeUndefined();
        expect(notificationsRepository.create).toHaveBeenCalled();
    });

    it('pushes referral rewards, which have no per-type preference', async () => {
        await service.createNotification({ userId: 'u1', actorId: 'u2', type: 'referral_reward', itineraryId: 'i1' });

        expect(pushNotificationsService.sendNotificationPush).toHaveBeenCalled();
    });
});

describe('NotificationsService.getPreferences() / updatePreferences()', () => {
    let service;
    let notificationsRepository;

    beforeEach(() => {
        notificationsRepository = {
            getPreferences: vi.fn().mockResolvedValue({
                notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true,
            }),
            upsertPreferences: vi.fn().mockResolvedValue({
                notifyOnComment: false, notifyOnLike: true, notifyOnFollow: true,
            }),
        };
        service = new NotificationsService(notificationsRepository);
    });

    it('delegates getPreferences to the repository', async () => {
        const preferences = await service.getPreferences('u1');

        expect(notificationsRepository.getPreferences).toHaveBeenCalledWith('u1');
        expect(preferences.notifyOnComment).toBe(true);
    });

    it('delegates updatePreferences to the repository', async () => {
        const preferences = await service.updatePreferences('u1', { notifyOnComment: false });

        expect(notificationsRepository.upsertPreferences).toHaveBeenCalledWith('u1', { notifyOnComment: false });
        expect(preferences.notifyOnComment).toBe(false);
    });
});

describe('NotificationsService.notifyFollowers()', () => {
    const PREFERENCES = { notifyOnComment: true, notifyOnLike: true, notifyOnFollow: true, notifyOnFriendStamps: true, pushEnabled: false };
    let service;
    let notificationsRepository;

    beforeEach(() => {
        notificationsRepository = {
            findFollowerIds: vi.fn().mockResolvedValue(['f1', 'f2']),
            getPreferences: vi.fn().mockResolvedValue(PREFERENCES),
            create: vi.fn().mockResolvedValue({ grouped: false }),
        };
        service = new NotificationsService(notificationsRepository);
    });

    it("tells each of the user's followers, as that user", async () => {
        await service.notifyFollowers({ actorId: 'ana', type: 'friend_stamp', countryCode: 'PT' });

        expect(notificationsRepository.findFollowerIds).toHaveBeenCalledWith('ana');
        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'f1', actorId: 'ana', type: 'friend_stamp', countryCode: 'PT' }));
        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'f2', actorId: 'ana', type: 'friend_stamp', countryCode: 'PT' }));
    });

    it("respects a follower who turned these notices off", async () => {
        notificationsRepository.getPreferences.mockImplementation(async (userId) => (
            userId === 'f1' ? { ...PREFERENCES, notifyOnFriendStamps: false } : PREFERENCES
        ));

        await service.notifyFollowers({ actorId: 'ana', type: 'friend_stamp', countryCode: 'PT' });

        expect(notificationsRepository.create).toHaveBeenCalledTimes(1);
        expect(notificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'f2' }));
    });

    it("still tells the rest when one of them fails", async () => {
        notificationsRepository.create.mockRejectedValueOnce(new Error('db down')).mockResolvedValue({ grouped: false });

        await service.notifyFollowers({ actorId: 'ana', type: 'friend_stamp', countryCode: 'PT' });

        expect(notificationsRepository.create).toHaveBeenCalledTimes(2);
    });

    // A popular user can have thousands of followers.
    it('tells them a batch at a time, not all at once', async () => {
        const followers = Array.from({ length: 45 }, (_, index) => `f${index}`);
        notificationsRepository.findFollowerIds.mockResolvedValue(followers);
        let inFlight = 0;
        let maxInFlight = 0;
        notificationsRepository.create.mockImplementation(async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise(resolve => setTimeout(resolve, 1));
            inFlight -= 1;
            return { grouped: false };
        });

        await service.notifyFollowers({ actorId: 'ana', type: 'friend_stamp', badgeId: 'adventurer' });

        expect(notificationsRepository.create).toHaveBeenCalledTimes(45);
        expect(maxInFlight).toBeLessThan(45);
    });
});
