export class RecapController {
    constructor(recapService) {
        this.recapService = recapService;
    }

    async getMyRecap(req, res, next) {
        try {
            const recap = await this.recapService.getMyRecap(req.user.id);
            res.status(200).json(recap);
        } catch (error) {
            next(error);
        }
    }

    async announceScheduled(req, res, next) {
        try {
            const announced = await this.recapService.announce();
            res.status(200).json({ announced });
        } catch (error) {
            next(error);
        }
    }
}
