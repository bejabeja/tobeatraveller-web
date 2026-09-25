import { NotFoundError } from '../errors/NotFoundError.js';
import { BADGES } from '../utils/badges.js';
import { logger } from '../utils/logger.js';

export const BADGE_EARNED_NOTIFICATION_TYPE = 'badge_earned';

export class BadgeService {
    constructor(badgeRepository, notificationsService = null, userRepository = null) {
        this.badgeRepository = badgeRepository;
        this.notificationsService = notificationsService;
        this.userRepository = userRepository;
    }

    // Saves every badge the user now qualifies for and hasn't earned yet.
    // Called after the actions that can move a metric (new trip, follow, van
    // log or diary entry). `notify: false` is for catching up silently: the
    // one-off backfill of existing users, and the check when the owner opens
    // their own badges, so old achievements don't arrive as a burst of news.
    async evaluateUser(userId, { notify = true } = {}) {
        const { inserted } = await this._evaluate(userId, { notify });
        return inserted;
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
    async getPassport(profileUserId, viewerId = null) {
        const owner = await this.userRepository.getUserById(profileUserId);
        if (!owner) throw new NotFoundError("User not found");

        const isOwner = viewerId === profileUserId;
        const [{ metrics, earned }, visits] = await Promise.all([
            isOwner ? this._evaluate(profileUserId, { notify: false }) : this._loadState(profileUserId),
            this.badgeRepository.getCountryVisits(profileUserId),
        ]);
        const earnedAtById = new Map(earned.map(badge => [badge.badgeId, badge.earnedAt]));

        const achievements = BADGES
            .filter(badge => isOwner || badge.publicMetric != null)
            .map((badge) => {
                const isEarnedForViewer = earnedAtById.has(badge.id)
                    && (isOwner || metrics[badge.publicMetric] >= badge.threshold);
                return {
                    id: badge.id,
                    family: badge.family,
                    threshold: badge.threshold,
                    isPrivate: badge.publicMetric == null,
                    earnedAt: isEarnedForViewer ? earnedAtById.get(badge.id) : null,
                    // Progress reveals private counts, so only the owner gets it.
                    ...(isOwner ? { current: metrics[badge.metric] } : {}),
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

        return {
            owner: { id: owner.id, username: owner.username, avatarUrl: owner.avatarUrl },
            achievements,
            countries,
        };
    }

    async _loadState(userId) {
        const [metrics, earned] = await Promise.all([
            this.badgeRepository.getMetrics(userId),
            this.badgeRepository.findEarnedByUserId(userId),
        ]);
        return { metrics, earned };
    }

    async _evaluate(userId, { notify }) {
        const { metrics, earned } = await this._loadState(userId);
        const earnedIds = new Set(earned.map(badge => badge.badgeId));
        const qualified = BADGES
            .filter(badge => !earnedIds.has(badge.id) && metrics[badge.metric] >= badge.threshold)
            .map(badge => badge.id);

        const inserted = await this.badgeRepository.insertEarned(userId, qualified);
        if (notify && this.notificationsService) {
            await Promise.all(inserted.map(badgeId => this.notificationsService.createNotification({
                userId, actorId: userId, type: BADGE_EARNED_NOTIFICATION_TYPE, badgeId,
            })));
        }

        const earnedNow = new Date();
        return {
            metrics,
            earned: [...earned, ...inserted.map(badgeId => ({ badgeId, earnedAt: earnedNow }))],
            inserted,
        };
    }
}
