import { ValidationError } from '../errors/ValidationError.js';
import { createVanLogEntrySchema, vanLogEntrySchema } from '../utils/schemasValidation.js';

export class VanLogController {
    constructor(vanLogService) {
        this.vanLogService = vanLogService;
    }

    async createEntry(req, res, next) {
        const result = createVanLogEntrySchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const entry = await this.vanLogService.createEntry(result.data, req.user.id);
            res.status(201).json(entry);
        } catch (error) {
            next(error);
        }
    }

    async getMyEntries(req, res, next) {
        try {
            const { category, country, currency, dateFrom, dateTo } = req.query;
            const entries = await this.vanLogService.getEntriesByUser(req.user.id, { category, country, currency, dateFrom, dateTo });
            res.status(200).json(entries);
        } catch (error) {
            next(error);
        }
    }

    async updateEntry(req, res, next) {
        const result = vanLogEntrySchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const { id } = req.params;
            const entry = await this.vanLogService.updateEntry(id, result.data, req.user.id);
            res.status(200).json(entry);
        } catch (error) {
            next(error);
        }
    }

    async deleteEntry(req, res, next) {
        try {
            const { id } = req.params;
            await this.vanLogService.deleteEntry(id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async getStats(req, res, next) {
        try {
            const { category, country, currency, dateFrom, dateTo } = req.query;
            const stats = await this.vanLogService.getStats(req.user.id, { category, country, currency, dateFrom, dateTo });
            res.status(200).json(stats);
        } catch (error) {
            next(error);
        }
    }
}
