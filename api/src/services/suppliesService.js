import { ForbiddenError } from '../errors/ForbiddenError.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { getOwnedEntity } from '../utils/ownedEntity.js';

// Wraps a freshly-typed note with the quantity it came with (e.g. "2x for the pie"),
// so once several contributions of the same item get merged together, each one's
// context survives instead of the later merge silently overwriting the earlier note.
const formatNoteSegment = (amount, notes) => (notes ? `${amount}x ${notes}` : null);

// Appends one already-formatted notes block onto another. Used when merging two
// items that may each already carry a multi-segment note from earlier merges,
// so blocks are concatenated as-is rather than re-wrapped with another amount prefix.
const appendNotes = (existingNotes, incomingNotes) => {
    if (!incomingNotes) return existingNotes;
    return existingNotes ? `${existingNotes}, ${incomingNotes}` : incomingNotes;
};

// Freemium: shopping list and inventory are each free to browse and to add
// items to, up to this many, then require Premium for unlimited items. Each
// list has its own independent cap (they're modeled as two separate stores);
// merging an amount into an item the user already owns doesn't add a row, so
// it never counts against the cap, only creating a net-new item does.
const FREE_ITEM_LIMIT = 10;

export class SuppliesService {
    constructor(inventoryRepository, shoppingListRepository, userRepository) {
        this.inventoryRepository = inventoryRepository;
        this.shoppingListRepository = shoppingListRepository;
        this.userRepository = userRepository;
    }

    // ─── Shopping list ──────────────────────────────────────────────────
    async getShoppingList(userId) {
        const items = await this.shoppingListRepository.findByUserId(userId);
        return items.map(item => item.toDTO());
    }

    // Adding an item that's already on the list (same name + unit) sums into it
    // instead of creating a duplicate row, mirroring how a purchase merges into inventory.
    async addShoppingListItem(data, userId) {
        const existing = await this.shoppingListRepository.findByNameAndUnit(userId, data.name, data.unit);
        if (!existing) await this._assertCanAddShoppingListItem(userId);
        const incomingNotes = formatNoteSegment(data.amount, data.notes);

        const item = existing
            ? await this.shoppingListRepository.update(existing.id, {
                name: existing.name,
                category: existing.category,
                amount: existing.amount + data.amount,
                unit: existing.unit,
                notes: appendNotes(existing.notes, incomingNotes),
            })
            : await this.shoppingListRepository.create({ ...data, userId, notes: incomingNotes });
        return item.toDTO();
    }

    async updateShoppingListItem(id, data, userId) {
        const item = await this._getOwnedShoppingListItem(id, userId);
        const updated = await this.shoppingListRepository.update(item.id, data);
        return updated.toDTO();
    }

    async deleteShoppingListItem(id, userId) {
        await this._getOwnedShoppingListItem(id, userId);
        await this.shoppingListRepository.delete(id);
    }

    // Buying an item merges it into inventory: adds to the matching item's amount
    // (same name + unit) if one already exists, otherwise creates a new one.
    // purchasedAmount lets the store not have as much as was planned (e.g. only 3 of
    // the 6 apples on the list): the bought portion moves to inventory, the rest
    // stays on the shopping list instead of disappearing.
    async markPurchased(id, userId, purchasedAmount) {
        const item = await this._getOwnedShoppingListItem(id, userId);
        const boughtAmount = purchasedAmount != null ? Math.min(purchasedAmount, item.amount) : item.amount;

        const existing = await this.inventoryRepository.findByNameAndUnit(userId, item.name, item.unit);
        const inventoryItem = existing
            ? await this.inventoryRepository.update(existing.id, {
                name: existing.name,
                category: existing.category,
                amount: existing.amount + boughtAmount,
                unit: existing.unit,
                notes: appendNotes(existing.notes, item.notes),
            })
            : await this.inventoryRepository.create({
                userId, name: item.name, category: item.category, amount: boughtAmount,
                unit: item.unit, notes: item.notes,
            });

        const remaining = item.amount - boughtAmount;
        if (remaining > 0) {
            await this.shoppingListRepository.update(id, {
                name: item.name, category: item.category, amount: remaining, unit: item.unit, notes: item.notes,
            });
        } else {
            await this.shoppingListRepository.delete(id);
        }

        return inventoryItem.toDTO();
    }

    // ─── Inventory ──────────────────────────────────────────────────────
    async getInventory(userId) {
        const items = await this.inventoryRepository.findByUserId(userId);
        return items.map(item => item.toDTO());
    }

    // For cataloguing stock you already have without pretending you're about to
    // shop for it (e.g. setting up the app for the first time, or a gift). Merges
    // into an existing item with the same name + unit, same as everywhere else.
    async addInventoryItem(data, userId) {
        const existing = await this.inventoryRepository.findByNameAndUnit(userId, data.name, data.unit);
        if (!existing) await this._assertCanAddInventoryItem(userId);
        const incomingNotes = formatNoteSegment(data.amount, data.notes);

        const item = existing
            ? await this.inventoryRepository.update(existing.id, {
                name: existing.name,
                category: existing.category,
                amount: existing.amount + data.amount,
                unit: existing.unit,
                notes: appendNotes(existing.notes, incomingNotes),
            })
            : await this.inventoryRepository.create({ ...data, userId, notes: incomingNotes });
        return item.toDTO();
    }

    async updateInventoryItem(id, data, userId) {
        const item = await this._getOwnedInventoryItem(id, userId);
        const updated = await this.inventoryRepository.update(item.id, data);
        return updated.toDTO();
    }

    async deleteInventoryItem(id, userId) {
        await this._getOwnedInventoryItem(id, userId);
        await this.inventoryRepository.delete(id);
    }

    // Using some of an item either just lowers the amount you still have (consumedAmount
    // less than what's in stock), or, once it hits zero, moves it back to the shopping
    // list - merging into an existing list entry for the same name + unit if there is one.
    async markUsedUp(id, userId, consumedAmount) {
        const item = await this._getOwnedInventoryItem(id, userId);
        const usedAmount = consumedAmount != null ? Math.min(consumedAmount, item.amount) : item.amount;
        const remaining = item.amount - usedAmount;

        if (remaining > 0) {
            const updated = await this.inventoryRepository.update(id, {
                name: item.name, category: item.category, amount: remaining, unit: item.unit, notes: item.notes,
            });
            return updated.toDTO();
        }

        const existing = await this.shoppingListRepository.findByNameAndUnit(userId, item.name, item.unit);
        const shoppingListItem = existing
            ? await this.shoppingListRepository.update(existing.id, {
                name: existing.name,
                category: existing.category,
                amount: existing.amount + usedAmount,
                unit: existing.unit,
                notes: appendNotes(existing.notes, item.notes),
            })
            : await this.shoppingListRepository.create({
                userId, name: item.name, category: item.category, amount: usedAmount, unit: item.unit, notes: item.notes,
            });

        await this.inventoryRepository.delete(id);
        return shoppingListItem.toDTO();
    }

    // ─── Ownership guards ───────────────────────────────────────────────
    async _getOwnedShoppingListItem(id, userId) {
        return getOwnedEntity(this.shoppingListRepository, id, userId, "Shopping list item not found");
    }

    async _getOwnedInventoryItem(id, userId) {
        return getOwnedEntity(this.inventoryRepository, id, userId, "Inventory item not found");
    }

    // ─── Freemium ───────────────────────────────────────────────────────
    async getFreeTierUsage(userId) {
        const [shoppingList, inventory] = await Promise.all([
            this.getShoppingListFreeTierUsage(userId),
            this.getInventoryFreeTierUsage(userId),
        ]);
        return { shoppingList, inventory };
    }

    async getShoppingListFreeTierUsage(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (STAFF_ROLES.includes(user?.role) || user?.isPremium()) {
            return { limited: false, used: null, limit: FREE_ITEM_LIMIT };
        }

        const used = await this.shoppingListRepository.countByUserId(userId);
        return { limited: true, used, limit: FREE_ITEM_LIMIT };
    }

    async getInventoryFreeTierUsage(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (STAFF_ROLES.includes(user?.role) || user?.isPremium()) {
            return { limited: false, used: null, limit: FREE_ITEM_LIMIT };
        }

        const used = await this.inventoryRepository.countByUserId(userId);
        return { limited: true, used, limit: FREE_ITEM_LIMIT };
    }

    async _assertCanAddShoppingListItem(userId) {
        const usage = await this.getShoppingListFreeTierUsage(userId);
        if (usage.limited && usage.used >= usage.limit) {
            throw new ForbiddenError(`Free plan limit of ${FREE_ITEM_LIMIT} shopping list items reached`, 'shoppingListCap');
        }
    }

    async _assertCanAddInventoryItem(userId) {
        const usage = await this.getInventoryFreeTierUsage(userId);
        if (usage.limited && usage.used >= usage.limit) {
            throw new ForbiddenError(`Free plan limit of ${FREE_ITEM_LIMIT} inventory items reached`, 'inventoryCap');
        }
    }
}
