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
