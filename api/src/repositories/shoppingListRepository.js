import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { ShoppingListItem } from '../models/shoppingListItem.js';

export class ShoppingListRepository {
    async create(data) {
        const { userId, name, category, amount, unit, notes } = data;
        const id = data.id ?? uuidv4();

        const query = `
            INSERT INTO shopping_list_items (id, user_id, name, category, amount, unit, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *;
        `;
        const result = await client.query(query, [
            id, userId, name, category ?? 'other', amount, unit, notes ?? null,
        ]);
        return ShoppingListItem.fromDb(result.rows[0]);
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT * FROM shopping_list_items WHERE user_id = $1 ORDER BY created_at ASC`,
            [userId]
        );
        return result.rows.map(ShoppingListItem.fromDb);
    }

    async findById(id) {
        const result = await client.query(`SELECT * FROM shopping_list_items WHERE id = $1`, [id]);
        return result.rows.length ? ShoppingListItem.fromDb(result.rows[0]) : null;
    }

    async countByUserId(userId) {
        const result = await client.query(
            `SELECT COUNT(*)::int AS count FROM shopping_list_items WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0].count;
    }

    async findByNameAndUnit(userId, name, unit) {
        const result = await client.query(
            `SELECT * FROM shopping_list_items WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND unit = $3`,
            [userId, name, unit]
        );
        return result.rows.length ? ShoppingListItem.fromDb(result.rows[0]) : null;
    }

    async update(id, data) {
        const { name, category, amount, unit, notes } = data;
        const query = `
            UPDATE shopping_list_items SET
                name = $1, category = $2, amount = $3, unit = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *;
        `;
        const result = await client.query(query, [name, category ?? 'other', amount, unit, notes ?? null, id]);
        return result.rows.length ? ShoppingListItem.fromDb(result.rows[0]) : null;
    }

    async delete(id) {
        await client.query(`DELETE FROM shopping_list_items WHERE id = $1`, [id]);
    }
}
