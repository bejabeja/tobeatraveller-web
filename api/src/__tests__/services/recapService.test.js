import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECAP_READY_NOTIFICATION_TYPE, RecapService } from '../../services/recapService.js';

const at = (isoDate) => new Date(`${isoDate}T12:00:00Z`);

describe('RecapService', () => {
    let recapRepository;
    let notificationsService;
    let service;

    beforeEach(() => {
        recapRepository = {
            getCountries: vi.fn().mockResolvedValue([]),
            getDaysOnRoad: vi.fn().mockResolvedValue(0),
            getTrips: vi.fn().mockResolvedValue({ count: 0, longest: null }),
            getVanLog: vi.fn().mockResolvedValue({ entries: 0, nights: 0, refuels: 0, liters: 0 }),
            getDiary: vi.fn().mockResolvedValue({ entries: 0, wouldReturn: 0 }),
            getBadgesEarned: vi.fn().mockResolvedValue([]),
            findUsersWithActivity: vi.fn().mockResolvedValue([]),
        };
        notificationsService = { createNotification: vi.fn().mockResolvedValue() };
        service = new RecapService(recapRepository, notificationsService);
    });

    describe('availableYear()', () => {
        it.each([
            ['2026-12-01', 2026], ['2026-12-31', 2026], ['2027-01-15', 2026], ['2027-01-31', 2026],
        ])('on %s offers the recap of %i', (date, year) => {
            expect(service.availableYear(at(date))).toBe(year);
        });

        it.each(['2026-11-30', '2027-02-01', '2026-06-15'])('offers no recap on %s', (date) => {
            expect(service.availableYear(at(date))).toBeNull();
        });
    });

    describe('getMyRecap()', () => {
        it('is not available outside December and January', async () => {
            expect(await service.getMyRecap('user-1', at('2026-09-25'))).toEqual({ available: false });
            expect(recapRepository.getCountries).not.toHaveBeenCalled();
        });

        it('looks at the whole recap year, also in January', async () => {
            await service.getMyRecap('user-1', at('2027-01-10'));

            expect(recapRepository.getCountries).toHaveBeenCalledWith('user-1', '2026-01-01', '2026-12-31');
        });

        it("gathers the year: countries (new ones and where they spent the most days), trips, van, diary and badges", async () => {
            recapRepository.getCountries.mockResolvedValue([
                { code: 'PT', days: 20, firstEverVisitedOn: '2026-05-01' },
                { code: 'ES', days: 12, firstEverVisitedOn: '2024-08-10' },
                { code: 'FR', days: 3, firstEverVisitedOn: '2026-10-02' },
            ]);
            recapRepository.getDaysOnRoad.mockResolvedValue(87);
            recapRepository.getTrips.mockResolvedValue({ count: 2, longest: { title: 'Portugal coast', days: 21 } });
            recapRepository.getVanLog.mockResolvedValue({ entries: 40, nights: 25, refuels: 9, liters: 412.7 });
            recapRepository.getDiary.mockResolvedValue({ entries: 15, wouldReturn: 11 });
            recapRepository.getBadgesEarned.mockResolvedValue(['countries_1']);

            const recap = await service.getMyRecap('user-1', at('2026-12-05'));

            expect(recap).toEqual({
                available: true,
                year: 2026,
                hasActivity: true,
                countries: { codes: ['PT', 'ES', 'FR'], newCodes: ['PT', 'FR'], top: { code: 'PT', days: 20 } },
                daysOnRoad: 87,
                trips: { count: 2, longest: { title: 'Portugal coast', days: 21 } },
                vanLog: { entries: 40, nights: 25, refuels: 9, liters: 413 },
                diary: { entries: 15, wouldReturn: 11 },
                badges: ['countries_1'],
            });
        });

        it('says so when there was nothing logged in the year', async () => {
            const recap = await service.getMyRecap('user-1', at('2026-12-05'));

            expect(recap.hasActivity).toBe(false);
            expect(recap.countries.top).toBeNull();
        });
    });

    describe('announce()', () => {
        it("tells everyone with activity in the year that their recap is ready", async () => {
            recapRepository.findUsersWithActivity.mockResolvedValue(['u1', 'u2']);

            const announced = await service.announce(at('2026-12-01'));

            expect(recapRepository.findUsersWithActivity).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
            expect(notificationsService.createNotification).toHaveBeenCalledWith({ userId: 'u1', actorId: 'u1', type: RECAP_READY_NOTIFICATION_TYPE });
            expect(notificationsService.createNotification).toHaveBeenCalledWith({ userId: 'u2', actorId: 'u2', type: RECAP_READY_NOTIFICATION_TYPE });
            expect(announced).toBe(2);
        });

        it('announces nothing outside the recap window', async () => {
            expect(await service.announce(at('2026-09-25'))).toBe(0);
            expect(recapRepository.findUsersWithActivity).not.toHaveBeenCalled();
        });

        // One user's failed notification must not stop everyone else's.
        it('keeps announcing when one notification fails', async () => {
            recapRepository.findUsersWithActivity.mockResolvedValue(['u1', 'u2']);
            notificationsService.createNotification.mockRejectedValueOnce(new Error('boom'));

            await service.announce(at('2026-12-01'));

            expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
        });
    });
});
