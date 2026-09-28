import { ValidationError } from '../errors/ValidationError.js';
import {
    createPackingItemSchema, createPackingListSchema, packingItemSchema, packingListSchema, updatePackingListSchema,
} from '../utils/schemasValidation.js';

const validationError = (result) => new ValidationError(result.error.errors[0]?.message || "Validation failed");

export class PackingChecklistController {
    constructor(packingChecklistService) {
        this.packingChecklistService = packingChecklistService;
    }

    async getLists(req, res, next) {
        try {
            const lists = await this.packingChecklistService.getLists(req.user.id);
            res.status(200).json(lists);
        } catch (error) {
            next(error);
        }
    }

    async createList(req, res, next) {
        const result = createPackingListSchema.safeParse(req.body);
        if (!result.success) return next(validationError(result));
        try {
            const list = await this.packingChecklistService.createList(result.data, req.user.id);
            res.status(201).json(list);
        } catch (error) {
            next(error);
        }
    }

    async duplicateList(req, res, next) {
        const result = packingListSchema.safeParse(req.body);
        if (!result.success) return next(validationError(result));
        try {
            const list = await this.packingChecklistService.duplicateList(req.params.listId, result.data.name, req.user.id);
            res.status(201).json(list);
        } catch (error) {
            next(error);
        }
    }

    async updateList(req, res, next) {
        const result = updatePackingListSchema.safeParse(req.body);
        if (!result.success) return next(validationError(result));
        try {
            const list = await this.packingChecklistService.updateList(req.params.listId, result.data, req.user.id);
            res.status(200).json(list);
        } catch (error) {
            next(error);
        }
    }

    async deleteList(req, res, next) {
        try {
            await this.packingChecklistService.deleteList(req.params.listId, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async getItems(req, res, next) {
        try {
            const items = await this.packingChecklistService.getItems(req.params.listId, req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async addItem(req, res, next) {
        const result = createPackingItemSchema.safeParse(req.body);
        if (!result.success) return next(validationError(result));
        try {
            const item = await this.packingChecklistService.addItem(req.params.listId, result.data, req.user.id);
            res.status(201).json(item);
        } catch (error) {
            next(error);
        }
    }

    async restartList(req, res, next) {
        try {
            const items = await this.packingChecklistService.restartList(req.params.listId, req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async updateItem(req, res, next) {
        const result = packingItemSchema.partial().safeParse(req.body);
        if (!result.success) return next(validationError(result));
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
