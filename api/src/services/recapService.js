import { logger } from '../utils/logger.js';

export const RECAP_READY_NOTIFICATION_TYPE = 'recap_ready';

// Like other yearly recaps, it's an event: offered through December and
// January for the year that is ending or just ended, not all year round.
const DECEMBER = 11;
const JANUARY = 0;
// Announcements go out a few at a time so thousands of users don't exhaust
// the database connection pool at once.
const ANNOUNCE_BATCH_SIZE = 20;

const yearRange = (year) => ({ from: `${year}-01-01`, to: `${year}-12-31` });

export class RecapService {
    constructor(recapRepository, notificationsService = null) {
        this.recapRepository = recapRepository;
        this.notificationsService = notificationsService;
    }

    availableYear(now = new Date()) {
        const month = now.getUTCMonth();
        if (month === DECEMBER) return now.getUTCFullYear();
        if (month === JANUARY) return now.getUTCFullYear() - 1;
        return null;
    }

    async getMyRecap(userId, now = new Date()) {
        const year = this.availableYear(now);
        if (year === null) return { available: false };

        const { from, to } = yearRange(year);
        const [countries, daysOnRoad, trips, vanLog, diary, badges] = await Promise.all([
            this.recapRepository.getCountries(userId, from, to),
            this.recapRepository.getDaysOnRoad(userId, from, to),
            this.recapRepository.getTrips(userId, from, to),
            this.recapRepository.getVanLog(userId, from, to),
            this.recapRepository.getDiary(userId, from, to),
            this.recapRepository.getBadgesEarned(userId, from, to),
        ]);

        return {
            available: true,
            year,
            hasActivity: daysOnRoad > 0 || trips.count > 0 || vanLog.entries > 0 || diary.entries > 0,
            countries: {
                // Most days first, as the repository returns them.
                codes: countries.map(country => country.code),
                newCodes: countries.filter(country => country.firstEverVisitedOn?.startsWith(`${year}-`)).map(country => country.code),
                top: countries[0] ? { code: countries[0].code, days: countries[0].days } : null,
            },
            daysOnRoad,
            trips,
            vanLog: { ...vanLog, liters: Math.round(vanLog.liters) },
            diary,
            badges,
        };
    }

    // Run by the yearly cron on December 1st. Returns how many were told.
    async announce(now = new Date()) {
        const year = this.availableYear(now);
        if (year === null || !this.notificationsService) return 0;

        const { from, to } = yearRange(year);
        const userIds = await this.recapRepository.findUsersWithActivity(from, to);
        for (let start = 0; start < userIds.length; start += ANNOUNCE_BATCH_SIZE) {
            const batch = userIds.slice(start, start + ANNOUNCE_BATCH_SIZE);
            await Promise.all(batch.map(userId => this.notificationsService
                .createNotification({ userId, actorId: userId, type: RECAP_READY_NOTIFICATION_TYPE })
                .catch(err => logger.error(`[recap] failed to announce the recap to ${userId}:`, err))));
        }
        logger.info(`[recap] announced the ${year} recap to ${userIds.length} users`);
        return userIds.length;
    }
}
