import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { PackingList } from '../models/packingList.js';

// Each list with how many things it has, how many are ticked off and the
// title of the trip it's for, for the overview of a user's lists.
const LIST_WITH_COUNTS = `
    SELECT lists.*,
        trips.title AS itinerary_title,
        COUNT(items.id) AS item_count,
        COUNT(items.id) FILTER (WHERE items.checked) AS checked_count
    FROM packing_lists lists
    LEFT JOIN itineraries trips ON trips.id = lists.itinerary_id
    LEFT JOIN packing_list_items items ON items.list_id = lists.id
`;
const GROUP_BY_LIST = 'GROUP BY lists.id, trips.title';

export class PackingListRepository {
    async create({ id, userId, name, itineraryId }) {
        const result = await client.query(
            `INSERT INTO packing_lists (id, user_id, name, itinerary_id) VALUES ($1, $2, $3, $4) RETURNING *;`,
            [id ?? uuidv4(), userId, name, itineraryId ?? null]
        );
        return PackingList.fromDb(result.rows[0]);
    }

    async findByUserId(userId) {
        const result = await client.query(
            `${LIST_WITH_COUNTS} WHERE lists.user_id = $1 ${GROUP_BY_LIST} ORDER BY lists.created_at ASC`,
            [userId]
        );
        return result.rows.map(PackingList.fromDb);
    }

    async findById(id) {
        const result = await client.query(`${LIST_WITH_COUNTS} WHERE lists.id = $1 ${GROUP_BY_LIST}`, [id]);
        return result.rows.length ? PackingList.fromDb(result.rows[0]) : null;
    }

    async countByUserId(userId) {
        const result = await client.query(`SELECT COUNT(*) AS count FROM packing_lists WHERE user_id = $1`, [userId]);
        return Number(result.rows[0].count);
    }

    async update(id, { name, itineraryId }) {
        await client.query(
            `UPDATE packing_lists SET name = $1, itinerary_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [name, itineraryId, id]
        );
        return this.findById(id);
    }

    // Trips starting on `day` with something still unticked on their lists:
    // whose they are and how much is left, counting all of a trip's lists.
    async findTripsToRemind(day) {
        const result = await client.query(
            `SELECT lists.user_id, lists.itinerary_id,
                COUNT(items.id) FILTER (WHERE NOT items.checked) AS remaining_count
             FROM packing_lists lists
             JOIN itineraries trips ON trips.id = lists.itinerary_id AND trips.user_id = lists.user_id
             JOIN packing_list_items items ON items.list_id = lists.id
             WHERE trips.start_date = $1
             GROUP BY lists.user_id, lists.itinerary_id
             HAVING COUNT(items.id) FILTER (WHERE NOT items.checked) > 0`,
            [day]
        );
        return result.rows.map(row => ({
            userId: row.user_id,
            itineraryId: row.itinerary_id,
            remainingCount: Number(row.remaining_count),
        }));
    }

    async delete(id) {
        await client.query(`DELETE FROM packing_lists WHERE id = $1`, [id]);
    }
}
