import { AUDIT_EVENTS } from '../utils/auditEvents.js';

// Both sides win (Dropbox-style), rewarded only once the invitee shows real
// engagement (their first itinerary), not at signup: guards against
// fake-account farming while still being generous enough to be worth sharing.
const REFERRAL_REWARD_DAYS = 30;
const REWARD_DURATION_MS = REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000;

// Caps how many *referrer* rewards one person can farm in a month by
// signing up throwaway accounts and giving each a trivial first itinerary.
// The referred side is unaffected (a given account can only ever be
// rewarded once, enforced by the `referrals.referred_user_id` UNIQUE
// constraint), so this only bounds the payout, not genuine sharing.
// Generous enough that no real power-user invite streak would hit it.
const MONTHLY_REFERRAL_REWARD_LIMIT = 10;

export class ReferralService {
    constructor(
        referralRepository, userRepository, auditLogService = null,
        notificationsService = null, emailService = null
    ) {
        this.referralRepository = referralRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.notificationsService = notificationsService;
        this.emailService = emailService;
    }

    // Usernames are already unique case-insensitively (see the 031 migration),
    // so lowercasing one gives a referral code with the same uniqueness
    // guarantee for free, more memorable than a random string, and easier to
    // share by word of mouth than a hex code. Snapshotted into its own column
    // at signup (or on first lazy generation below) rather than read live off
    // the username, so a later rename never breaks a link someone already shared.
    codeFromUsername(username) {
        return username.trim().toLowerCase();
    }

    async getOrCreateReferralCode(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (user?.referralCode) return user.referralCode;

        const updated = await this.userRepository.setReferralCodeIfUnset(userId, this.codeFromUsername(user.username));
        if (updated) return updated.referralCode;

        // Lost the race to a concurrent request that set it first; read back
        // whatever code actually landed instead of retrying the write.
        const refreshed = await this.userRepository.getUserById(userId);
        return refreshed.referralCode;
    }

    async getStats(userId) {
        return this.referralRepository.getStats(userId);
    }

    async getInvites(userId) {
        return this.referralRepository.getInvitesByReferrerId(userId);
    }

    // Staff-only overview (see referralRouter.js): platform-wide totals plus
    // the top referrers, so an admin can tell whether the loop is actually
    // working and whether referral_reward_capped is firing often enough to
    // suggest real abuse rather than just healthy sharing.
    async getPlatformOverview() {
        const [stats, topReferrers, cappedEvents] = await Promise.all([
            this.referralRepository.getPlatformStats(),
            this.referralRepository.getTopReferrers(10),
            this.auditLogService
                ? this.auditLogService.getFiltered({ action: AUDIT_EVENTS.REFERRAL_REWARD_CAPPED, limit: 1 })
                : Promise.resolve({ total: 0 }),
        ]);
        return { ...stats, topReferrers, cappedCount: cappedEvents.total };
    }

    // Called during signup, fire-and-forget from UserService: an invalid or
    // unknown code should never block account creation.
    async registerSignup(referralCode, referredUserId) {
        if (!referralCode) return;

        const referrer = await this.userRepository.findByReferralCode(referralCode);
        if (!referrer || referrer.id === referredUserId) return;

        await this.referralRepository.createPending(referrer.id, referredUserId);
    }

    // Called after a user's first itinerary is created; no-ops for everyone
    // else (no pending referral to reward). itineraryId is only used to give
    // the resulting notifications a link back to the trip that triggered them.
    //
    // The referred user's own reward always goes through: they signed up and
    // shared a real trip, so it's earned regardless of what their referrer
    // has done elsewhere. Only the referrer's side is gated on the monthly
    // cap, since that's the side someone farming fake accounts is after.
    async rewardFirstItinerary(referredUserId, itineraryId = null) {
        const referral = await this.referralRepository.findPendingByReferredUserId(referredUserId);
        if (!referral) return;

        const referrerCapped = await this._referrerHitMonthlyLimit(referral.referrerId);

        const [referrer, referred] = await Promise.all([
            referrerCapped ? null : this._grantPremiumDays(referral.referrerId),
            this._grantPremiumDays(referredUserId),
        ]);
        await this.referralRepository.markRewarded(referral.id);

        this.auditLogService?.log(referrerCapped ? {
            actorId: referredUserId,
            action: AUDIT_EVENTS.REFERRAL_REWARD_CAPPED,
            targetUserId: referral.referrerId,
            metadata: { referralId: referral.id, monthlyLimit: MONTHLY_REFERRAL_REWARD_LIMIT },
        } : {
            actorId: referredUserId,
            action: AUDIT_EVENTS.REFERRAL_REWARD_GRANTED,
            targetUserId: referral.referrerId,
            metadata: { referralId: referral.id, rewardDays: REFERRAL_REWARD_DAYS },
        });

        this.notificationsService?.createNotification({
            userId: referredUserId, actorId: referral.referrerId, type: 'referral_reward', itineraryId,
        }).catch(() => {});

        if (referrerCapped) return;

        this.notificationsService?.createNotification({
            userId: referral.referrerId, actorId: referredUserId, type: 'referral_reward', itineraryId,
        }).catch(() => {});

        // Email only goes to the referrer, not the referred user: the referred
        // user is already mid-session (they just created this itinerary) and
        // gets the in-app notification above, while the referrer may not be
        // active right now, so a re-engagement email is the one worth sending.
        if (referrer?.email) {
            this.emailService?.sendReferralReward({
                username: referrer.username, email: referrer.email, friendUsername: referred?.username,
            }).catch(() => {});
        }
    }

    async _referrerHitMonthlyLimit(referrerId) {
        if (!this.auditLogService) return false;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { total } = await this.auditLogService.getFiltered({
            targetUserId: referrerId,
            action: AUDIT_EVENTS.REFERRAL_REWARD_GRANTED,
            dateFrom: startOfMonth.toISOString(),
            limit: 1,
        });
        return total >= MONTHLY_REFERRAL_REWARD_LIMIT;
    }

    async _grantPremiumDays(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) return null;

        const base = user.isPremium() ? new Date(user.premiumUntil) : new Date();
        const premiumUntil = new Date(base.getTime() + REWARD_DURATION_MS);
        await this.userRepository.updatePremiumUntil(userId, premiumUntil);
        return user;
    }
}
