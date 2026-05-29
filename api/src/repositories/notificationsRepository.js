import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';

export class NotificationsRepository {
    async create({ id, userId, actorId, type, itineraryId, commentId }) {
        try {
            const notificationId = id || uuidv4();
            const query = `
                INSERT INTO notifications (id, user_id, actor_id, type, itinerary_id, comment_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            await client.query(query, [notificationId, userId, actorId, type, itineraryId ?? null, commentId ?? null]);
        } catch (_err) {
            // fire-and-forget: swallow errors silently
        }
    }

    async getByUserId(userId, limit = 20, offset = 0) {
        const query = `
            SELECT
                n.id,
                n.type,
                n.is_read,
                n.created_at,
                a.id         AS actor_id,
                a.username   AS actor_username,
                a.avatar_url AS actor_avatar_url,
                i.id         AS itinerary_id,
                i.title      AS itinerary_title
            FROM notifications n
            JOIN users a ON n.actor_id = a.id
            LEFT JOIN itineraries i ON n.itinerary_id = i.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await client.query(query, [userId, limit, offset]);
        return result.rows.map(row => ({
            id: row.id,
            type: row.type,
            isRead: row.is_read,
            createdAt: row.created_at,
            actor: {
                id: row.actor_id,
                username: row.actor_username,
                avatarUrl: row.actor_avatar_url,
            },
            itinerary: row.itinerary_id
                ? { id: row.itinerary_id, title: row.itinerary_title }
                : null,
        }));
    }

    async markAllAsRead(userId) {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
        `;
        await client.query(query, [userId]);
    }

    async getUnreadCount(userId) {
        const result = await client.query(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    }
}
