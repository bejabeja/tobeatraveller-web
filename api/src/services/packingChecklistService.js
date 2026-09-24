import { ConflictError } from '../errors/ConflictError.js';
import { findClientCreatedEntity, getOwnedEntity } from '../utils/ownedEntity.js';

export class PackingChecklistService {
    constructor(packingChecklistRepository) {
        this.packingChecklistRepository = packingChecklistRepository;
    }

    async getChecklist(userId) {
        const items = await this.packingChecklistRepository.findByUserId(userId);
        return items.map(item => item.toDTO());
    }

    async addItem(data, userId) {
        // Checked before the duplicate-name check, which a replayed create
        // would otherwise trip over its own earlier insert.
        const alreadyCreated = await findClientCreatedEntity(this.packingChecklistRepository, data.id, userId);
        if (alreadyCreated) return alreadyCreated.toDTO();

        const existing = await this.packingChecklistRepository.findByUserId(userId);
        const isDuplicate = existing.some(item =>
            item.category === data.category && item.name.toLowerCase() === data.name.toLowerCase()
        );
        if (isDuplicate) {
            throw new ConflictError('Item already in this category');
        }

        const item = await this.packingChecklistRepository.create({ ...data, userId });
        return item.toDTO();
    }

    // Only creates items the user doesn't already have (matched by name + category,
    // case-insensitive), so this is safe to call repeatedly: on a brand new checklist
    // it seeds everything, and on a later call (e.g. a "restore defaults" button) it
    // only brings back template items the user deleted, without duplicating the rest.
    async seedDefaults(items, userId) {
        const existing = await this.packingChecklistRepository.findByUserId(userId);
        const existingKeys = new Set(existing.map(item => `${item.category}|${item.name.toLowerCase()}`));
        const missingItems = items.filter(item => !existingKeys.has(`${item.category}|${item.name.toLowerCase()}`));

        if (missingItems.length === 0) {
            return existing.map(item => item.toDTO());
        }
        await this.packingChecklistRepository.createMany(userId, missingItems);
        return this.getChecklist(userId);
    }

    async resetTrip(userId) {
        const items = await this.packingChecklistRepository.uncheckAll(userId);
        return items.map(item => item.toDTO());
    }

    async updateItem(id, data, userId) {
        const item = await this._getOwnedItem(id, userId);
        const updated = await this.packingChecklistRepository.update(item.id, {
            category: data.category ?? item.category,
            name: data.name ?? item.name,
            checked: data.checked ?? item.checked,
        });
        return updated.toDTO();
    }

    async deleteItem(id, userId) {
        await this._getOwnedItem(id, userId);
        await this.packingChecklistRepository.delete(id);
    }

    async _getOwnedItem(id, userId) {
        return getOwnedEntity(this.packingChecklistRepository, id, userId, "Packing checklist item not found");
    }
}
