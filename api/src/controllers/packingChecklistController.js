import { ValidationError } from '../errors/ValidationError.js';
import { createPackingItemSchema, packingItemSchema, packingSeedSchema } from '../utils/schemasValidation.js';

export class PackingChecklistController {
    constructor(packingChecklistService) {
        this.packingChecklistService = packingChecklistService;
    }

    async getChecklist(req, res, next) {
        try {
            const items = await this.packingChecklistService.getChecklist(req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async addItem(req, res, next) {
        const result = createPackingItemSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const item = await this.packingChecklistService.addItem(result.data, req.user.id);
            res.status(201).json(item);
        } catch (error) {
            next(error);
        }
    }

    async seedDefaults(req, res, next) {
        const result = packingSeedSchema.safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const items = await this.packingChecklistService.seedDefaults(result.data.items, req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async resetTrip(req, res, next) {
        try {
            const items = await this.packingChecklistService.resetTrip(req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async updateItem(req, res, next) {
        const result = packingItemSchema.partial().safeParse(req.body);
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const item = await this.packingChecklistService.updateItem(req.params.id, result.data, req.user.id);
            res.status(200).json(item);
        } catch (error) {
            next(error);
        }
    }

    async deleteItem(req, res, next) {
        try {
            await this.packingChecklistService.deleteItem(req.params.id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
