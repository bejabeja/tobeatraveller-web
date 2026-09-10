import { ValidationError } from '../errors/ValidationError.js';
import { supplyItemSchema, purchaseAmountSchema, consumeAmountSchema } from '../utils/schemasValidation.js';

export class SuppliesController {
    constructor(suppliesService) {
        this.suppliesService = suppliesService;
    }

    _validate(req, next) {
        const result = supplyItemSchema.safeParse(req.body);
        if (!result.success) {
            next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
            return null;
        }
        return result.data;
    }

    async getFreeTierUsage(req, res, next) {
        try {
            const usage = await this.suppliesService.getFreeTierUsage(req.user.id);
            res.status(200).json(usage);
        } catch (error) {
            next(error);
        }
    }

    // ─── Shopping list ──────────────────────────────────────────────────
    async getShoppingList(req, res, next) {
        try {
            const items = await this.suppliesService.getShoppingList(req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async addShoppingListItem(req, res, next) {
        const data = this._validate(req, next);
        if (!data) return;
        try {
            const item = await this.suppliesService.addShoppingListItem(data, req.user.id);
            res.status(201).json(item);
        } catch (error) {
            next(error);
        }
    }

    async updateShoppingListItem(req, res, next) {
        const data = this._validate(req, next);
        if (!data) return;
        try {
            const item = await this.suppliesService.updateShoppingListItem(req.params.id, data, req.user.id);
            res.status(200).json(item);
        } catch (error) {
            next(error);
        }
    }

    async deleteShoppingListItem(req, res, next) {
        try {
            await this.suppliesService.deleteShoppingListItem(req.params.id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async markPurchased(req, res, next) {
        const result = purchaseAmountSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const item = await this.suppliesService.markPurchased(req.params.id, req.user.id, result.data.purchasedAmount);
            res.status(200).json(item);
        } catch (error) {
            next(error);
        }
    }

    // ─── Inventory ──────────────────────────────────────────────────────
    async getInventory(req, res, next) {
        try {
            const items = await this.suppliesService.getInventory(req.user.id);
            res.status(200).json(items);
        } catch (error) {
            next(error);
        }
    }

    async addInventoryItem(req, res, next) {
        const data = this._validate(req, next);
        if (!data) return;
        try {
            const item = await this.suppliesService.addInventoryItem(data, req.user.id);
            res.status(201).json(item);
        } catch (error) {
            next(error);
        }
    }

    async updateInventoryItem(req, res, next) {
        const data = this._validate(req, next);
        if (!data) return;
        try {
            const item = await this.suppliesService.updateInventoryItem(req.params.id, data, req.user.id);
            res.status(200).json(item);
        } catch (error) {
            next(error);
        }
    }

    async deleteInventoryItem(req, res, next) {
        try {
            await this.suppliesService.deleteInventoryItem(req.params.id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async markUsedUp(req, res, next) {
        const result = consumeAmountSchema.safeParse(req.body ?? {});
        if (!result.success) {
            return next(new ValidationError(result.error.errors[0]?.message || "Validation failed"));
        }
        try {
            const item = await this.suppliesService.markUsedUp(req.params.id, req.user.id, result.data.consumedAmount);
            res.status(200).json(item);
        } catch (error) {
            next(error);
        }
    }
}
