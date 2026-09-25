import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ANDROID_NOTIFICATION_CHANNEL_ID, PushNotificationsService, STALE_PUSH_TOKEN_DAYS,
} from '../../services/pushNotificationsService.js';

const device = (token, locale = 'en') => ({ token, platform: 'android', locale });

const expoResponse = (tickets) => ({
    ok: true,
    json: vi.fn().mockResolvedValue({ data: tickets }),
});

describe('PushNotificationsService.sendNotificationPush()', () => {
    let service;
    let pushTokensRepository;
    let userRepository;
    let itineraryRepository;
    let fetchMock;

    beforeEach(() => {
        pushTokensRepository = {
            findByUserId: vi.fn().mockResolvedValue([device('ExponentPushToken[a]')]),
            deleteTokens: vi.fn().mockResolvedValue(),
        };
        userRepository = { getUserById: vi.fn().mockResolvedValue({ id: 'u2', username: 'jane' }) };
        itineraryRepository = { findById: vi.fn().mockResolvedValue({ id: 'i1', title: 'Picos de Europa' }) };
        fetchMock = vi.fn().mockResolvedValue(expoResponse([{ status: 'ok', id: 'ticket-1' }]));
        vi.stubGlobal('fetch', fetchMock);
        service = new PushNotificationsService(pushTokensRepository, userRepository, itineraryRepository);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const sentMessages = () => JSON.parse(fetchMock.mock.calls[0][1].body);

    it('sends one message per device, in that device language', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([
            device('ExponentPushToken[en]', 'en'), device('ExponentPushToken[es]', 'es'),
        ]);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'comment', itineraryId: 'i1' });

        expect(sentMessages()).toEqual([
            expect.objectContaining({ to: 'ExponentPushToken[en]', body: 'jane commented on "Picos de Europa"' }),
            expect.objectContaining({ to: 'ExponentPushToken[es]', body: 'jane comentó en "Picos de Europa"' }),
        ]);
    });

    it('attaches the navigation data and the Android channel the app creates', async () => {
        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'comment', itineraryId: 'i1', commentId: 'c1' });

        expect(sentMessages()[0]).toMatchObject({
            data: { type: 'comment', actorId: 'u2', itineraryId: 'i1', commentId: 'c1' },
            channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
        });
    });

    it('names the new country in each device language', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([
            device('ExponentPushToken[en]', 'en'), device('ExponentPushToken[es]', 'es'),
        ]);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u1', type: 'country_stamp', countryCode: 'IT' });

        expect(sentMessages()).toEqual([
            expect.objectContaining({ body: expect.stringContaining('Italy') }),
            expect.objectContaining({ body: expect.stringContaining('Italia') }),
        ]);
        expect(sentMessages()[0].data).toMatchObject({ type: 'country_stamp', actorId: 'u1', countryCode: 'IT' });
    });

    it('announces the yearly recap in each device language', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([
            device('ExponentPushToken[en]', 'en'), device('ExponentPushToken[es]', 'es'),
        ]);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u1', type: 'recap_ready' });

        expect(sentMessages()).toEqual([
            expect.objectContaining({ title: expect.stringContaining('year') }),
            expect.objectContaining({ title: expect.stringContaining('año') }),
        ]);
    });

    // So tapping it opens the card of that very badge, ready to share.
    it('tells the app which badge was earned', async () => {
        await service.sendNotificationPush({ userId: 'u1', actorId: 'u1', type: 'badge_earned', badgeId: 'countries_5' });

        expect(sentMessages()[0].data).toMatchObject({ type: 'badge_earned', badgeId: 'countries_5' });
    });

    it('falls back to English for a locale without translations', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([device('ExponentPushToken[a]', 'fr')]);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(sentMessages()[0].body).toBe('jane started following you');
    });

    it('does not call Expo when the recipient has no registered devices', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([]);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not call Expo when the actor no longer exists', async () => {
        userRepository.getUserById.mockResolvedValue(null);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not call Expo when the itinerary was deleted before the push went out', async () => {
        itineraryRepository.findById.mockResolvedValue(null);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'like', itineraryId: 'i1' });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('removes the tokens Expo reports as no longer registered', async () => {
        pushTokensRepository.findByUserId.mockResolvedValue([
            device('ExponentPushToken[alive]'), device('ExponentPushToken[gone]'),
        ]);
        fetchMock.mockResolvedValue(expoResponse([
            { status: 'ok', id: 'ticket-1' },
            { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
        ]));

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(pushTokensRepository.deleteTokens).toHaveBeenCalledWith(['ExponentPushToken[gone]']);
    });

    it('splits more than 100 devices into several Expo requests', async () => {
        const devices = Array.from({ length: 101 }, (_, index) => device(`ExponentPushToken[${index}]`));
        pushTokensRepository.findByUserId.mockResolvedValue(devices);

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toHaveLength(1);
    });

    it('keeps every token when the Expo request itself fails', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 503 });

        await service.sendNotificationPush({ userId: 'u1', actorId: 'u2', type: 'follow' });

        expect(pushTokensRepository.deleteTokens).not.toHaveBeenCalled();
    });
});

describe('PushNotificationsService.purgeStaleTokens()', () => {
    it('deletes tokens not seen within the retention window', async () => {
        const pushTokensRepository = { deleteNotSeenSince: vi.fn().mockResolvedValue(3) };
        const service = new PushNotificationsService(pushTokensRepository, {}, {});

        const deletedCount = await service.purgeStaleTokens();

        expect(pushTokensRepository.deleteNotSeenSince).toHaveBeenCalledWith(STALE_PUSH_TOKEN_DAYS);
        expect(deletedCount).toBe(3);
    });
});
