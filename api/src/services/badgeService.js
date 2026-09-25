import { NotFoundError } from '../errors/NotFoundError.js';
import { BADGE_FAMILIES, BADGES } from '../utils/badges.js';
import { logger } from '../utils/logger.js';

export const BADGE_EARNED_NOTIFICATION_TYPE = 'badge_earned';
export const COUNTRY_STAMP_NOTIFICATION_TYPE = 'country_stamp';
const LEADERBOARD_SIZE = 10;
// The daily job evaluates a few users at a time, not to exhaust the
// database connection pool when many trips start on the same day.
const DAILY_EVALUATION_BATCH_SIZE = 20;

export class BadgeService {
    constructor(badgeRepository, notificationsService = null, userRepository = null) {
        this.badgeRepository = badgeRepository;
        this.notificationsService = notificationsService;
        this.userRepository = userRepository;
    }

    // Saves every badge the user now qualifies for and hasn't earned yet, and
    // stamps every country they have newly been to. Called after the actions
    // that can move a metric (new trip, follow, van log or diary entry).
    // `notify: false` is for the one-off backfill of existing users, so their
    // old achievements and countries don't arrive as a burst of news.
    async evaluateUser(userId, { notify = true } = {}) {
        const { inserted } = await this._evaluate(userId, { notify });
        return inserted;
    }

    // Run daily by cron. A trip's country only counts from its first day, and
    // the user may do nothing in the app that day: this stamps it (and tells
    // them) on the day. Returns how many users were evaluated.
    async evaluateTripsStartingToday() {
        const userIds = await this.badgeRepository.findUsersWithTripStartingToday();
        for (let start = 0; start < userIds.length; start += DAILY_EVALUATION_BATCH_SIZE) {
            const batch = userIds.slice(start, start + DAILY_EVALUATION_BATCH_SIZE);
            await Promise.all(batch.map(userId => this.evaluateUser(userId)
                .catch(err => logger.error(`[badges] failed to evaluate ${userId} on their trip's first day:`, err))));
        }
        logger.info(`[badges] evaluated ${userIds.length} users whose trip starts today`);
        return userIds.length;
    }

    // For the actions that can earn a badge: they must neither wait for the
    // evaluation nor fail because of it.
    evaluateUserInBackground(userId) {
        this.evaluateUser(userId).catch(err => logger.error('[badges] failed to evaluate badges:', err));
    }

    // The whole collection: every achievement stamp (earned or still locked)
    // and one stamp per visited country. The owner sees everything, with
    // their progress; everyone else only sees what public data backs, so the
    // private families (van log, diary) and private countries stay hidden.
    // `publicView` gives the owner that same public version, to share it.
    async getPassport(profileUserId, viewerId = null, { publicView = false } = {}) {
        const owner = await this.userRepository.getUserById(profileUserId);
        if (!owner) throw new NotFoundError("User not found");

        const isOwner = viewerId === profileUserId && !publicView;
        // The owner's own view also saves (and announces) anything not saved
        // yet: it can get there before the evaluation an action started, and
        // only whichever saves it first announces it.
        const [{ metrics, earned, visits }, declared] = await Promise.all([
            isOwner ? this._evaluate(profileUserId, { notify: true }) : this._loadState(profileUserId),
            this.badgeRepository.findDeclaredCountries(profileUserId),
        ]);
        const earnedAtById = new Map(earned.map(badge => [badge.badgeId, badge.earnedAt]));

        const achievements = BADGES
            .filter(badge => isOwner || badge.publicMetric != null)
            .map((badge) => {
                const isEarned = earnedAtById.has(badge.id);
                const isVisibleToOthers = isEarned && badge.publicMetric != null && metrics[badge.publicMetric] >= badge.threshold;
                const isEarnedForViewer = isOwner ? isEarned : isVisibleToOthers;
                return {
                    id: badge.id,
                    family: badge.family,
                    threshold: badge.threshold,
                    isPrivate: badge.publicMetric == null,
                    earnedAt: isEarnedForViewer ? earnedAtById.get(badge.id) : null,
                    // Progress reveals private counts, so only the owner gets it,
                    // along with whether others see the badge as earned (e.g. a
                    // countries badge reached through van log countries they
                    // don't): sharing it would reveal it.
                    ...(isOwner ? { current: metrics[badge.metric], visibleToOthers: isVisibleToOthers } : {}),
                };
            });

        const countries = visits
            .filter(visit => isOwner || visit.firstPublicVisitedOn)
            .map(visit => ({
                code: visit.code,
                firstVisitedOn: isOwner ? visit.firstVisitedOn : visit.firstPublicVisitedOn,
                isPrivate: !visit.firstPublicVisitedOn,
            }))
            .sort((a, b) => a.firstVisitedOn.localeCompare(b.firstVisitedOn));

        // Declared by the user, so public, but kept apart from (and never
        // repeating) the countries this viewer sees as earned.
        const shownCodes = new Set(countries.map(country => country.code));
        const declaredCountries = declared
            .filter(country => !shownCodes.has(country.countryCode))
            .map(country => ({ code: country.countryCode, declaredAt: country.declaredAt }));

        const passport = {
            owner: { id: owner.id, username: owner.username, avatarUrl: owner.avatarUrl },
            achievements,
            countries,
            declaredCountries,
        };
        // Only for a signed-in member looking at someone else's passport.
        if (!viewerId || viewerId === profileUserId) return passport;
        const visibleCodes = [...countries.map(country => country.code), ...declaredCountries.map(country => country.code)];
        return { ...passport, comparison: await this._compareWithViewer(visibleCodes, viewerId) };
    }

    // The profile's visible countries against all of the viewer's own, private
    // and declared included: only the viewer sees the result.
    async _compareWithViewer(profileCodes, viewerId) {
        const [viewerVisits, viewerDeclared] = await Promise.all([
            this.badgeRepository.getCountryVisits(viewerId),
            this.badgeRepository.findDeclaredCountries(viewerId),
        ]);
        const viewerCodes = new Set([
            ...viewerVisits.map(visit => visit.code),
            ...viewerDeclared.map(country => country.countryCode),
        ]);
        return {
            inCommon: profileCodes.filter(code => viewerCodes.has(code)),
            onlyTheirs: profileCodes.filter(code => !viewerCodes.has(code)),
        };
    }

    // The user among the people they follow, by countries from public trips.
    async getFollowingLeaderboard(userId) {
        const rows = await this.badgeRepository.getFollowingLeaderboard(userId, LEADERBOARD_SIZE);
        return {
            entries: rows.map(({ user, countries, rank }) => ({ user, countries, rank, isMe: user.id === userId })),
            followsAnyone: rows.some(row => row.user.id !== userId),
        };
    }

    // Replaces the whole list: the owner edits it as a set of countries. The
    // ones they have earned since declaring them are locked in the picker, so
    // they never come back in the list, and their declaration is kept: others
    // may only see it as declared (if it was earned privately).
    async updateDeclaredCountries(userId, countryCodes) {
        const [visits, declared] = await Promise.all([
            this.badgeRepository.getCountryVisits(userId),
            this.badgeRepository.findDeclaredCountries(userId),
        ]);
        const earnedCodes = new Set(visits.map(visit => visit.code));
        const keptCodes = declared.map(country => country.countryCode).filter(code => earnedCodes.has(code));
        const unique = [...new Set([...countryCodes.map(code => code.toUpperCase()), ...keptCodes])];
        await this.badgeRepository.replaceDeclaredCountries(userId, unique);
    }

    async _loadState(userId) {
        const [metrics, earned, visits] = await Promise.all([
            this.badgeRepository.getMetrics(userId),
            this.badgeRepository.findEarnedByUserId(userId),
            this.badgeRepository.getCountryVisits(userId),
        ]);
        return { metrics, earned, visits };
    }

    async _evaluate(userId, { notify }) {
        const [{ metrics, earned, visits }, stampedCountries] = await Promise.all([
            this._loadState(userId),
            this.badgeRepository.findStampedCountries(userId),
        ]);
        const earnedIds = new Set(earned.map(badge => badge.badgeId));
        const qualified = BADGES
            .filter(badge => !earnedIds.has(badge.id) && metrics[badge.metric] >= badge.threshold)
            .map(badge => badge.id);
        const stampedCodes = new Set(stampedCountries.map(stamp => stamp.countryCode));
        const newCountryCodes = visits.map(visit => visit.code).filter(code => !stampedCodes.has(code));

        const [inserted, stampedNow] = await Promise.all([
            this.badgeRepository.insertEarned(userId, qualified),
            this.badgeRepository.insertCountryStamps(userId, newCountryCodes),
        ]);
        if (notify && this.notificationsService) {
            await this._notify(userId, inserted, stampedNow);
        }

        const earnedNow = new Date();
        return {
            metrics,
            visits,
            earned: [...earned, ...inserted.map(badgeId => ({ badgeId, earnedAt: earnedNow }))],
            inserted,
        };
    }

    // A countries badge already celebrates the country that reached it, so
    // that run's new countries aren't announced on top of it.
    async _notify(userId, badgeIds, countryCodes) {
        const earnedCountriesBadge = badgeIds.some(badgeId => BADGES.find(badge => badge.id === badgeId)?.family === BADGE_FAMILIES.COUNTRIES);
        const notifications = [
            ...badgeIds.map(badgeId => ({ type: BADGE_EARNED_NOTIFICATION_TYPE, badgeId })),
            ...(earnedCountriesBadge ? [] : countryCodes.map(countryCode => ({ type: COUNTRY_STAMP_NOTIFICATION_TYPE, countryCode }))),
        ];
        await Promise.all(notifications.map(notification => this.notificationsService.createNotification({
            userId, actorId: userId, ...notification,
        })));
    }
}
