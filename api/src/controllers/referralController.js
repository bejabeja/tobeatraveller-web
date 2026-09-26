export class ReferralController {
    constructor(referralService) {
        this.referralService = referralService;
    }

    async getMyReferralInfo(req, res, next) {
        try {
            const [referralCode, stats, invites] = await Promise.all([
                this.referralService.getOrCreateReferralCode(req.user.id),
                this.referralService.getStats(req.user.id),
                this.referralService.getInvites(req.user.id),
            ]);
            res.status(200).json({ referralCode, ...stats, invites });
        } catch (error) {
            next(error);
        }
    }

    // Daily, from Vercel Cron: earlier invite codes whose year is over are
    // deleted, and those names become free for anyone.
    async purgeRetiredCodesScheduled(req, res, next) {
        try {
            const deletedCount = await this.referralService.purgeRetiredCodes();
            res.status(200).json({ deletedCount });
        } catch (error) {
            next(error);
        }
    }

    async getAdminOverview(req, res, next) {
        try {
            const overview = await this.referralService.getPlatformOverview();
            res.status(200).json(overview);
        } catch (error) {
            next(error);
        }
    }
}
