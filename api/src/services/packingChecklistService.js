import { ConflictError } from '../errors/ConflictError.js';
import { ForbiddenError } from '../errors/ForbiddenError.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { findClientCreatedEntity, getOwnedEntity } from '../utils/ownedEntity.js';

// Free accounts keep up to this many lists; Premium and staff, as many as
// they want. Staff bypass it like requirePremium's own staff bypass.
const FREE_LIST_LIMIT = 2;

const itemKey = (item) => `${item.category}|${item.name.toLowerCase()}`;

// A template or a copied list never brings the same thing twice to a category.
const withoutRepeats = (items) => {
    const seen = new Set();
    return items.filter(item => {
        const key = itemKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export class PackingChecklistService {
    constructor(packingChecklistRepository, packingListRepository, userRepository, itineraryRepository) {
        this.packingChecklistRepository = packingChecklistRepository;
        this.packingListRepository = packingListRepository;
        this.userRepository = userRepository;
        this.itineraryRepository = itineraryRepository;
    }

    async getLists(userId) {
        const [lists, freeTierUsage] = await Promise.all([
            this.packingListRepository.findByUserId(userId),
            this.getFreeTierUsage(userId),
        ]);
        return { lists: lists.map(list => list.toDTO()), freeTierUsage };
    }

    // `items` is the template the list starts from, already in the app's
    // language (the templates live in shared/, with the rest of the copy);
    // `itineraryId`, the trip it's for, if any.
    async createList({ name, items, itineraryId = null }, userId) {
        await this._assertCanCreateList(userId);
        if (itineraryId) await this._getOwnedItinerary(itineraryId, userId);
        const list = await this.packingListRepository.create({ userId, name, itineraryId });
        await this.packingChecklistRepository.createMany(userId, list.id, withoutRepeats(items));
        return this._listDTO(list.id);
    }

    async duplicateList(listId, name, userId) {
        await this._getOwnedList(listId, userId);
        await this._assertCanCreateList(userId);
        const items = await this.packingChecklistRepository.findByListId(listId);
        const copy = await this.packingListRepository.create({ userId, name });
        await this.packingChecklistRepository.createMany(userId, copy.id, items);
        return this._listDTO(copy.id);
    }

    // Renaming it, or linking it to one of the user's trips (or to none,
    // with `itineraryId: null`).
    async updateList(listId, { name, itineraryId }, userId) {
        const list = await this._getOwnedList(listId, userId);
        if (itineraryId) await this._getOwnedItinerary(itineraryId, userId);
        const updated = await this.packingListRepository.update(listId, {
            name: name ?? list.name,
            itineraryId: itineraryId === undefined ? list.itineraryId : itineraryId,
        });
        return updated.toDTO();
    }

    async deleteList(listId, userId) {
        await this._getOwnedList(listId, userId);
        await this.packingListRepository.delete(listId);
    }

    async getItems(listId, userId) {
        await this._getOwnedList(listId, userId);
        const items = await this.packingChecklistRepository.findByListId(listId);
        return items.map(item => item.toDTO());
    }

    async addItem(listId, data, userId) {
        // Checked before the duplicate-name check, which a replayed create
        // would otherwise trip over its own earlier insert.
        const alreadyCreated = await findClientCreatedEntity(this.packingChecklistRepository, data.id, userId);
        if (alreadyCreated) return alreadyCreated.toDTO();

        await this._getOwnedList(listId, userId);
        const existing = await this.packingChecklistRepository.findByListId(listId);
        if (existing.some(item => itemKey(item) === itemKey(data))) {
            throw new ConflictError('Item already in this category');
        }

        const item = await this.packingChecklistRepository.create({ ...data, userId, listId });
        return item.toDTO();
    }

    // Unticks everything, for the next trip or the next time the van moves;
    // nothing is deleted.
    async restartList(listId, userId) {
        await this._getOwnedList(listId, userId);
        const items = await this.packingChecklistRepository.uncheckAll(listId);
        return items.map(item => item.toDTO());
    }

    // Ticking it, renaming it, moving it to another category or place, or
    // saying how many to take; `quantity: null` goes back to just the one.
    async updateItem(id, data, userId) {
        const item = await this._getOwnedItem(id, userId);
        const next = {
            category: data.category ?? item.category,
            name: data.name ?? item.name,
            quantity: data.quantity === undefined ? item.quantity : data.quantity,
            checked: data.checked ?? item.checked,
            position: data.position ?? item.position,
        };

        if (itemKey(next) !== itemKey(item)) {
            const siblings = await this.packingChecklistRepository.findByListId(item.listId);
            if (siblings.some(sibling => sibling.id !== item.id && itemKey(sibling) === itemKey(next))) {
                throw new ConflictError('Item already in this category');
            }
        }

        const updated = await this.packingChecklistRepository.update(item.id, next);
        return updated.toDTO();
    }

    async deleteItem(id, userId) {
        await this._getOwnedItem(id, userId);
        await this.packingChecklistRepository.delete(id);
    }

    // `used` stays null when the cap doesn't apply (Premium or staff), so the
    // client never mistakes "not limited" for "used 0 of the limit".
    async getFreeTierUsage(userId) {
        const user = await this.userRepository.getUserById(userId);
        if (STAFF_ROLES.includes(user?.role) || user?.isPremium()) {
            return { limited: false, used: null, limit: FREE_LIST_LIMIT };
        }

        const used = await this.packingListRepository.countByUserId(userId);
        return { limited: true, used, limit: FREE_LIST_LIMIT };
    }

    async _listDTO(listId) {
        const list = await this.packingListRepository.findById(listId);
        return list.toDTO();
    }

    async _assertCanCreateList(userId) {
        const usage = await this.getFreeTierUsage(userId);
        if (usage.limited && usage.used >= usage.limit) {
            throw new ForbiddenError(`Free plan limit of ${FREE_LIST_LIMIT} packing lists reached`, 'packingListCap');
        }
    }

    async _getOwnedList(listId, userId) {
        return getOwnedEntity(this.packingListRepository, listId, userId, "Packing list not found");
    }

    async _getOwnedItinerary(itineraryId, userId) {
        return getOwnedEntity(this.itineraryRepository, itineraryId, userId, "Itinerary not found");
    }

    async _getOwnedItem(id, userId) {
        return getOwnedEntity(this.packingChecklistRepository, id, userId, "Packing checklist item not found");
    }
}
