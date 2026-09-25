import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BADGE_EARNED_NOTIFICATION_TYPE, BadgeService } from '../../services/badgeService.js';

const metrics = (overrides = {}) => ({
    publicItineraries: 0, followers: 0, countries: 0, publicCountries: 0, vanLogEntries: 0, lifeDiaryEntries: 0,
    ...overrides,
});

describe('BadgeService', () => {
    let badgeRepository;
    let notificationsService;
    let userRepository;
    let service;

    beforeEach(() => {
        badgeRepository = {
            getMetrics: vi.fn().mockResolvedValue(metrics()),
            findEarnedByUserId: vi.fn().mockResolvedValue([]),
            insertEarned: vi.fn(async (userId, badgeIds) => badgeIds),
        };
        notificationsService = { createNotification: vi.fn().mockResolvedValue() };
        userRepository = { getUserById: vi.fn().mockResolvedValue({ id: 'user-1', username: 'jane', avatarUrl: null, email: 'jane@example.com' }) };
        service = new BadgeService(badgeRepository, notificationsService, userRepository);
    });

    describe('evaluateUser()', () => {
        it('grants every badge whose threshold the user now reaches', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 5, vanLogEntries: 1 }));

            const granted = await service.evaluateUser('user-1');

            expect(granted.sort()).toEqual(['adventurer', 'explorer', 'van_log_1']);
        });

        it('does not grant again a badge the user already has', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 5 }));
            badgeRepository.findEarnedByUserId.mockResolvedValue([{ badgeId: 'explorer', earnedAt: new Date() }]);

            await service.evaluateUser('user-1');

            expect(badgeRepository.insertEarned).toHaveBeenCalledWith('user-1', ['adventurer']);
        });

        it('notifies the user of each newly earned badge', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 1 }));

            await service.evaluateUser('user-1');

            expect(notificationsService.createNotification).toHaveBeenCalledWith({
                userId: 'user-1', actorId: 'user-1', type: BADGE_EARNED_NOTIFICATION_TYPE, badgeId: 'explorer',
            });
        });

        // A concurrent evaluation may have saved the badge first; announcing
        // it here too would notify the user twice.
        it('only notifies the badges it actually inserted', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 5 }));
            badgeRepository.insertEarned.mockResolvedValue(['adventurer']);

            await service.evaluateUser('user-1');

            expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
        });

        it('grants silently when asked not to notify', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 1 }));

            await service.evaluateUser('user-1', { notify: false });

            expect(badgeRepository.insertEarned).toHaveBeenCalledWith('user-1', ['explorer']);
            expect(notificationsService.createNotification).not.toHaveBeenCalled();
        });
    });

    describe('getPassport()', () => {
        const earned = (...badgeIds) => badgeIds.map(badgeId => ({ badgeId, earnedAt: new Date('2026-09-01') }));
        const visit = (code, firstVisitedOn, firstPublicVisitedOn = null) => ({ code, firstVisitedOn, firstPublicVisitedOn });
        const stamp = (achievements, id) => achievements.find(achievement => achievement.id === id);

        beforeEach(() => {
            badgeRepository.getCountryVisits = vi.fn().mockResolvedValue([]);
        });

        it('gives the owner every stamp in the catalog, earned and still locked, with their progress', async () => {
            badgeRepository.findEarnedByUserId.mockResolvedValue(earned('explorer'));
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 3 }));

            const { achievements } = await service.getPassport('user-1', 'user-1');

            expect(achievements).toHaveLength(14);
            expect(stamp(achievements, 'explorer')).toMatchObject({ earnedAt: new Date('2026-09-01'), current: 3 });
            expect(stamp(achievements, 'adventurer')).toMatchObject({ earnedAt: null, current: 3, threshold: 5 });
        });

        // Van log and diary are private: others shouldn't even see those
        // families as locked, let alone the counts behind them.
        it('hides the private families and all progress from other viewers', async () => {
            badgeRepository.findEarnedByUserId.mockResolvedValue(earned('explorer', 'van_log_1'));
            badgeRepository.getMetrics.mockResolvedValue(metrics({ publicItineraries: 1, vanLogEntries: 3 }));

            const { achievements } = await service.getPassport('user-1', 'someone-else');

            expect(achievements.map(achievement => achievement.family)).not.toContain('vanLog');
            expect(achievements.map(achievement => achievement.family)).not.toContain('lifeDiary');
            expect(achievements.every(achievement => achievement.current === undefined)).toBe(true);
            expect(stamp(achievements, 'explorer').earnedAt).toEqual(new Date('2026-09-01'));
        });

        it('shows a country stamp as locked to others when public trips alone do not reach it', async () => {
            badgeRepository.findEarnedByUserId.mockResolvedValue(earned('countries_1', 'countries_5'));
            badgeRepository.getMetrics.mockResolvedValue(metrics({ countries: 5, publicCountries: 2 }));

            const { achievements } = await service.getPassport('user-1', null);

            expect(stamp(achievements, 'countries_1').earnedAt).not.toBeNull();
            expect(stamp(achievements, 'countries_5').earnedAt).toBeNull();
        });

        it('gives the owner every visited country, marking the ones only private entries prove', async () => {
            badgeRepository.getCountryVisits.mockResolvedValue([
                visit('ES', '2026-03-01', '2026-05-01'),
                visit('FR', '2026-06-10'),
            ]);

            const { countries } = await service.getPassport('user-1', 'user-1');

            expect(countries).toEqual([
                { code: 'ES', firstVisitedOn: '2026-03-01', isPrivate: false },
                { code: 'FR', firstVisitedOn: '2026-06-10', isPrivate: true },
            ]);
        });

        // Showing the earlier (van log) date would reveal private activity.
        it('shows others only publicly visited countries, dated by the first public trip', async () => {
            badgeRepository.getCountryVisits.mockResolvedValue([
                visit('ES', '2026-03-01', '2026-05-01'),
                visit('FR', '2026-06-10'),
                visit('IT', '2026-04-01', '2026-04-01'),
            ]);

            const { countries } = await service.getPassport('user-1', 'someone-else');

            expect(countries).toEqual([
                { code: 'IT', firstVisitedOn: '2026-04-01', isPrivate: false },
                { code: 'ES', firstVisitedOn: '2026-05-01', isPrivate: false },
            ]);
        });

        it('silently grants the owner anything missed, and includes it right away', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ vanLogEntries: 1 }));

            const { achievements } = await service.getPassport('user-1', 'user-1');

            expect(stamp(achievements, 'van_log_1').earnedAt).toBeInstanceOf(Date);
            expect(notificationsService.createNotification).not.toHaveBeenCalled();
        });

        it('identifies whose passport it is, without private profile fields', async () => {
            const { owner } = await service.getPassport('user-1', 'someone-else');

            expect(owner).toEqual({ id: 'user-1', username: 'jane', avatarUrl: null });
        });

        it('throws NotFoundError for a user that does not exist', async () => {
            userRepository.getUserById.mockResolvedValue(null);

            await expect(service.getPassport('missing', null)).rejects.toMatchObject({ statusCode: 404 });
        });

        it('does not evaluate anything when someone else views the passport', async () => {
            badgeRepository.getMetrics.mockResolvedValue(metrics({ vanLogEntries: 1 }));

            await service.getPassport('user-1', 'someone-else');

            expect(badgeRepository.insertEarned).not.toHaveBeenCalled();
        });
    });

    describe('evaluateUserInBackground()', () => {
        it('does not throw when the evaluation fails', async () => {
            badgeRepository.getMetrics.mockRejectedValue(new Error('db down'));

            expect(() => service.evaluateUserInBackground('user-1')).not.toThrow();
            await new Promise(resolve => setImmediate(resolve));
        });
    });
});
