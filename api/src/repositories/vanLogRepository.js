import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { VanLogEntry, toDateOnlyString } from '../models/vanLogEntry.js';

export class VanLogRepository {
    async create(data) {
        const {
            userId, category, title, amount, currency, pricePerLiter,
            location, notes, entryDate,
        } = data;
        const id = data.id ?? uuidv4();

        const query = `
            INSERT INTO van_log_entries (
                id, user_id, category, title, amount, currency, price_per_liter,
                location_name, location_country, location_label, latitude, longitude,
                notes, entry_date
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *;
        `;

        const result = await client.query(query, [
            id, userId, category, title ?? null, amount ?? null, currency ?? null, pricePerLiter ?? null,
            location?.name ?? null, location?.country ?? null, location?.label ?? null,
            location?.lat ?? null, location?.lon ?? null,
            notes ?? null, entryDate,
        ]);

        return VanLogEntry.fromDb(result.rows[0]);
    }

    async countByUserId(userId) {
        const result = await client.query(
            `SELECT COUNT(*)::int AS count FROM van_log_entries WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0].count;
    }

    buildFilters(userId, filters = {}) {
        const conditions = [`user_id = $1`];
        const values = [userId];
        let i = 2;

        if (filters.category) {
            conditions.push(`category = $${i++}`);
            values.push(filters.category);
        }

        if (filters.country) {
            conditions.push(`LOWER(location_country) = LOWER($${i++})`);
            values.push(filters.country);
        }

        // OR currency IS NULL: a free/no-amount entry (e.g. a fresh water tap
        // refill logged with no cost) has no currency to conflict with the
        // filter, so it stays visible regardless of which currency is selected.
        if (filters.currency) {
            conditions.push(`(currency = $${i++} OR currency IS NULL)`);
            values.push(filters.currency);
        }

        if (filters.dateFrom) {
            conditions.push(`entry_date >= $${i++}::date`);
            values.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            conditions.push(`entry_date <= $${i++}::date`);
            values.push(filters.dateTo);
        }

        return { conditions, values };
    }

    async findByUserId(userId, filters = {}) {
        const { conditions, values } = this.buildFilters(userId, filters);
        const result = await client.query(
            `SELECT * FROM van_log_entries WHERE ${conditions.join(" AND ")} ORDER BY entry_date DESC, created_at DESC`,
            values
        );
        return result.rows.map(VanLogEntry.fromDb);
    }

    async findById(id) {
        const result = await client.query(
            `SELECT * FROM van_log_entries WHERE id = $1`,
            [id]
        );
        return result.rows.length ? VanLogEntry.fromDb(result.rows[0]) : null;
    }

    async update(id, data) {
        const {
            category, title, amount, currency, pricePerLiter,
            location, notes, entryDate,
        } = data;

        const query = `
            UPDATE van_log_entries SET
                category = $1, title = $2, amount = $3, currency = $4, price_per_liter = $5,
                location_name = $6, location_country = $7, location_label = $8,
                latitude = $9, longitude = $10, notes = $11, entry_date = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *;
        `;

        const result = await client.query(query, [
            category, title ?? null, amount ?? null, currency ?? null, pricePerLiter ?? null,
            location?.name ?? null, location?.country ?? null, location?.label ?? null,
            location?.lat ?? null, location?.lon ?? null,
            notes ?? null, entryDate, id,
        ]);

        return result.rows.length ? VanLogEntry.fromDb(result.rows[0]) : null;
    }

    async delete(id) {
        await client.query(`DELETE FROM van_log_entries WHERE id = $1`, [id]);
    }

    // Grouped by currency too (not just category): summing across currencies
    // would silently add e.g. EUR and USD amounts together into one meaningless
    // number, so each currency present gets its own row.
    async getTotalsByCategory(userId, filters = {}) {
        const { conditions, values } = this.buildFilters(userId, filters);
        const result = await client.query(
            `SELECT category, currency, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count, MAX(entry_date) AS last_date
             FROM van_log_entries
             WHERE ${conditions.join(" AND ")}
             GROUP BY category, currency`,
            values
        );
        return result.rows.map(row => ({
            category: row.category,
            currency: row.currency,
            total: Number(row.total),
            count: row.count,
            lastDate: toDateOnlyString(row.last_date),
        }));
    }

    async getTotalsByCountry(userId, filters = {}) {
        const { conditions, values } = this.buildFilters(userId, filters);
        const result = await client.query(
            `SELECT location_country AS country, currency, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
             FROM van_log_entries
             WHERE ${conditions.join(" AND ")} AND location_country IS NOT NULL
             GROUP BY location_country, currency
             ORDER BY total DESC`,
            values
        );
        return result.rows.map(row => ({
            country: row.country,
            currency: row.currency,
            total: Number(row.total),
            count: row.count,
        }));
    }

    async getDistinctCurrencies(userId, filters = {}) {
        const { conditions, values } = this.buildFilters(userId, filters);
        const result = await client.query(
            `SELECT DISTINCT currency
             FROM van_log_entries
             WHERE ${conditions.join(" AND ")} AND currency IS NOT NULL
             ORDER BY currency`,
            values
        );
        return result.rows.map(row => row.currency);
    }
}
