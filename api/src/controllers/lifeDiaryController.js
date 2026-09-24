import { ValidationError } from '../errors/ValidationError.js';
import { createLifeDiaryEntrySchema, lifeDiaryEntrySchema } from '../utils/schemasValidation.js';

export class LifeDiaryController {
    constructor(lifeDiaryService) {
        this.lifeDiaryService = lifeDiaryService;
    }

    async createEntry(req, res, next) {
        const result = createLifeDiaryEntrySchema.safeParse(JSON.parse(req.body.entry));
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const images = req.files?.images || [];
            const entry = await this.lifeDiaryService.createEntry(result.data, images, req.user.id);
            res.status(201).json(entry);
        } catch (error) {
            next(error);
        }
    }

    async getMyEntries(req, res, next) {
        try {
            const entries = await this.lifeDiaryService.getEntriesByUser(req.user.id);
            res.status(200).json(entries);
        } catch (error) {
            next(error);
        }
    }

    async getFreeTierUsage(req, res, next) {
        try {
            const usage = await this.lifeDiaryService.getFreeTierUsage(req.user.id);
            res.status(200).json(usage);
        } catch (error) {
            next(error);
        }
    }

    async updateEntry(req, res, next) {
        const result = lifeDiaryEntrySchema.safeParse(JSON.parse(req.body.entry));
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const { id } = req.params;
            const images = req.files?.images || [];
            const entry = await this.lifeDiaryService.updateEntry(id, result.data, images, req.user.id);
            res.status(200).json(entry);
        } catch (error) {
            next(error);
        }
    }

    async deleteEntry(req, res, next) {
        try {
            const { id } = req.params;
            await this.lifeDiaryService.deleteEntry(id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
