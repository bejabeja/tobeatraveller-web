import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { PackingChecklistItem } from '../models/packingChecklistItem.js';

// The order people put their list in, and the order things were added in
// for any tie.
const LIST_ORDER = 'ORDER BY position ASC, created_at ASC';

export class PackingChecklistRepository {
    // A new item goes last in its list.
    async create(data) {
        const { userId, listId, category, name, quantity, checked } = data;
        const id = data.id ?? uuidv4();

        const query = `
            INSERT INTO packing_list_items (id, user_id, list_id, category, name, quantity, checked, position)
            VALUES ($1, $2, $3, $4, $5, $6, $7,
                (SELECT COALESCE(MAX(position), 0) + 1 FROM packing_list_items WHERE list_id = $3))
            RETURNING *;
        `;
        const result = await client.query(query, [id, userId, listId, category, name, quantity ?? null, checked ?? false]);
        return PackingChecklistItem.fromDb(result.rows[0]);
    }

    // A whole template, or the things of a list being copied, into a new
    // list in a single round trip instead of one query per item: it can be
    // dozens of rows. They keep the order they come in.
    async createMany(userId, listId, items) {
        if (items.length === 0) return [];

        const values = [];
        const params = [];
        let i = 1;
        items.forEach((item, index) => {
            values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(uuidv4(), userId, listId, item.category, item.name, item.quantity ?? null, index + 1);
        });

        const query = `
            INSERT INTO packing_list_items (id, user_id, list_id, category, name, quantity, position)
            VALUES ${values.join(', ')}
            RETURNING *;
        `;
        const result = await client.query(query, params);
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async uncheckAll(listId) {
        const result = await client.query(
            `WITH unchecked AS (
                UPDATE packing_list_items SET checked = false, updated_at = CURRENT_TIMESTAMP
                WHERE list_id = $1 RETURNING *
            )
            SELECT * FROM unchecked ${LIST_ORDER};`,
            [listId]
        );
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async findByListId(listId) {
        const result = await client.query(
            `SELECT * FROM packing_list_items WHERE list_id = $1 ${LIST_ORDER}`,
            [listId]
        );
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT * FROM packing_list_items WHERE user_id = $1 ORDER BY list_id, position ASC`,
            [userId]
        );
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async findById(id) {
        const result = await client.query(`SELECT * FROM packing_list_items WHERE id = $1`, [id]);
        return result.rows.length ? PackingChecklistItem.fromDb(result.rows[0]) : null;
    }

    async update(id, data) {
        const { category, name, quantity, checked, position } = data;
        const query = `
            UPDATE packing_list_items SET
                category = $1, name = $2, quantity = $3, checked = $4, position = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *;
        `;
        const result = await client.query(query, [category, name, quantity, checked, position, id]);
        return result.rows.length ? PackingChecklistItem.fromDb(result.rows[0]) : null;
    }

    async delete(id) {
        await client.query(`DELETE FROM packing_list_items WHERE id = $1`, [id]);
    }
}
