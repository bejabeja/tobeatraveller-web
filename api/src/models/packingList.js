export class PackingList {
    constructor({ id, userId, name, itineraryId, itineraryTitle, itemCount, checkedCount, createdAt, updatedAt }) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.itineraryId = itineraryId ?? null;
        this.itineraryTitle = itineraryTitle ?? null;
        this.itemCount = itemCount ?? 0;
        this.checkedCount = checkedCount ?? 0;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromDb(row) {
        return new PackingList({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            itineraryId: row.itinerary_id,
            itineraryTitle: row.itinerary_title,
            itemCount: row.item_count == null ? 0 : Number(row.item_count),
            checkedCount: row.checked_count == null ? 0 : Number(row.checked_count),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDTO() {
        return {
            id: this.id,
            name: this.name,
            // The trip it's for, if any.
            itinerary: this.itineraryId ? { id: this.itineraryId, title: this.itineraryTitle } : null,
            itemCount: this.itemCount,
            checkedCount: this.checkedCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
