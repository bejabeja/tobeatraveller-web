export class PackingChecklistItem {
    constructor({ id, userId, listId, category, name, quantity, position, checked, createdAt, updatedAt }) {
        this.id = id;
        this.userId = userId;
        this.listId = listId;
        this.category = category;
        this.name = name;
        this.quantity = quantity ?? null;
        this.position = position;
        this.checked = checked;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromDb(row) {
        return new PackingChecklistItem({
            id: row.id,
            userId: row.user_id,
            listId: row.list_id,
            category: row.category,
            name: row.name,
            quantity: row.quantity,
            position: row.position,
            checked: row.checked,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDTO() {
        return {
            id: this.id,
            userId: this.userId,
            listId: this.listId,
            category: this.category,
            name: this.name,
            quantity: this.quantity,
            position: this.position,
            checked: this.checked,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
