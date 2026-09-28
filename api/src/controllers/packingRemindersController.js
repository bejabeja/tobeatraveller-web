export class PackingRemindersController {
    constructor(packingRemindersService) {
        this.packingRemindersService = packingRemindersService;
    }

    async sendTripRemindersScheduled(req, res, next) {
        try {
            const result = await this.packingRemindersService.sendTripReminders();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
