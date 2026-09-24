import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { PackingChecklistItem } from '../models/packingChecklistItem.js';

export class PackingChecklistRepository {
    async create(data) {
        const { userId, category, name, checked } = data;
        const id = data.id ?? uuidv4();

        const query = `
            INSERT INTO packing_checklist_items (id, user_id, category, name, checked)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *;
        `;
        const result = await client.query(query, [id, userId, category, name, checked ?? false]);
        return PackingChecklistItem.fromDb(result.rows[0]);
    }

    // Seeds every default item in a single round trip instead of one query per
    // item (the seed list can be dozens of rows; sequential inserts would mean
    // that many awaited round trips on a new user's very first page load).
    async createMany(userId, items) {
        if (items.length === 0) return [];

        const values = [];
        const params = [];
        let i = 1;
        for (const item of items) {
            values.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(uuidv4(), userId, item.category, item.name);
        }

        const query = `
            INSERT INTO packing_checklist_items (id, user_id, category, name)
            VALUES ${values.join(', ')}
            RETURNING *;
        `;
        const result = await client.query(query, params);
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async uncheckAll(userId) {
        const result = await client.query(
            `UPDATE packing_checklist_items SET checked = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *;`,
            [userId]
        );
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT * FROM packing_checklist_items WHERE user_id = $1 ORDER BY created_at ASC`,
            [userId]
        );
        return result.rows.map(PackingChecklistItem.fromDb);
    }

    async findById(id) {
        const result = await client.query(`SELECT * FROM packing_checklist_items WHERE id = $1`, [id]);
        return result.rows.length ? PackingChecklistItem.fromDb(result.rows[0]) : null;
    }

    async update(id, data) {
        const { category, name, checked } = data;
        const query = `
            UPDATE packing_checklist_items SET
                category = $1, name = $2, checked = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *;
        `;
        const result = await client.query(query, [category, name, checked, id]);
        return result.rows.length ? PackingChecklistItem.fromDb(result.rows[0]) : null;
    }

    async delete(id) {
        await client.query(`DELETE FROM packing_checklist_items WHERE id = $1`, [id]);
    }
}
