import { logger } from '../utils/logger.js';
import { TRIP_REMINDER_DAYS_BEFORE } from '../utils/tripReminders.js';

const DAY_MS = 86_400_000;
const TRIP_REMINDER_TYPE = 'trip_packing';
// Reminders go out a few at a time, not to exhaust the database connection
// pool on a day with many trips starting.
const REMINDER_BATCH_SIZE = 20;

const calendarDayIn = (days, from) => new Date(from.getTime() + days * DAY_MS).toISOString().slice(0, 10);

// A couple of days before a trip, its owner is told how much is still to
// pack on its lists (if anything is), in the app and by push.
export class PackingRemindersService {
    constructor(packingListRepository, notificationsService) {
        this.packingListRepository = packingListRepository;
        this.notificationsService = notificationsService;
    }

    async sendTripReminders(now = new Date()) {
        const trips = await this.packingListRepository.findTripsToRemind(calendarDayIn(TRIP_REMINDER_DAYS_BEFORE, now));
        for (let start = 0; start < trips.length; start += REMINDER_BATCH_SIZE) {
            await Promise.all(trips.slice(start, start + REMINDER_BATCH_SIZE).map(({ userId, itineraryId, remainingCount }) => this.notificationsService
                .createNotification({ userId, actorId: userId, type: TRIP_REMINDER_TYPE, itineraryId, remainingCount })
                .catch(err => logger.error(`[packing] failed to remind ${userId} of trip ${itineraryId}:`, err))));
        }
        logger.info(`[packing] reminded ${trips.length} trips starting in ${TRIP_REMINDER_DAYS_BEFORE} days`);
        return { reminded: trips.length };
    }
}
