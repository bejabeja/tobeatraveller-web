import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';
import { logger } from '../utils/logger.js';
import { timeAgo } from '../utils/date.js';

const GROUPING_WINDOW_HOURS = 24;

const DEFAULT_NOTIFICATION_PREFERENCES = {
    notifyOnComment: true,
    notifyOnLike: true,
    notifyOnFollow: true,
    pushEnabled: true,
};

const mapPreferencesRow = (row) => ({
    notifyOnComment: row.notify_on_comment,
    notifyOnLike: row.notify_on_like,
    notifyOnFollow: row.notify_on_follow,
    pushEnabled: row.push_enabled,
});

export class NotificationsRepository {
    async create({ id, userId, actorId, type, itineraryId, commentId, badgeId, countryCode }) {
        try {
            // Folds into an existing notification of the same (user, type, itinerary)
            // opened within the grouping window. `created_at` is intentionally left out
            // of the SET clause so the window is measured from the first event in the
            // group, not refreshed on every fold; `last_activity_at` tracks recency for
            // sorting/display instead. actor_ids accumulates every distinct actor so the
            // "and N others" count reflects real participants, not just whether the
            // latest actor differs from the previous one.
            //
            // Known limitation: two truly concurrent first-events for a group that
            // doesn't exist yet can both miss this UPDATE and both INSERT below,
            // producing two rows instead of one. Not fixed with a DB constraint here
            // since a time-window group can't be expressed as a stable unique key; given
            // how rare and low-impact this is (the next event still folds correctly),
            // it's an accepted tradeoff rather than something worth a bigger redesign.
            const grouped = await client.query(
                `UPDATE notifications
                 SET actor_ids = CASE WHEN $1 = ANY(actor_ids) THEN actor_ids ELSE array_append(actor_ids, $1) END,
                     actor_id = $1, comment_id = $2, is_read = false, last_activity_at = NOW()
                 WHERE user_id = $3 AND type = $4
                   AND itinerary_id IS NOT DISTINCT FROM $5
                   AND badge_id IS NOT DISTINCT FROM $6
                   AND country_code IS NOT DISTINCT FROM $7
                   AND created_at > NOW() - INTERVAL '${GROUPING_WINDOW_HOURS} hours'
                 RETURNING id`,
                [actorId, commentId ?? null, userId, type, itineraryId ?? null, badgeId ?? null, countryCode ?? null]
            );
            if (grouped.rowCount > 0) return { grouped: true };

            const notificationId = id || uuidv4();
            const query = `
                INSERT INTO notifications (id, user_id, actor_id, type, itinerary_id, comment_id, badge_id, country_code, actor_ids)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ARRAY[$3]::UUID[])
            `;
            await client.query(query, [notificationId, userId, actorId, type, itineraryId ?? null, commentId ?? null, badgeId ?? null, countryCode ?? null]);
            return { grouped: false };
        } catch (err) {
            // fire-and-forget: don't let a notification failure break the caller's main flow
            logger.error('[notifications] failed to create notification:', err);
            return null;
        }
    }

    async getByUserId(userId, limit = 20, offset = 0) {
        const query = `
            SELECT
                n.id,
                n.type,
                n.is_read,
                n.last_activity_at,
                n.actor_ids,
                n.comment_id,
                n.badge_id,
                n.country_code,
                a.id         AS actor_id,
                a.username   AS actor_username,
                a.avatar_url AS actor_avatar_url,
                i.id         AS itinerary_id,
                i.title      AS itinerary_title
            FROM notifications n
            JOIN users a ON n.actor_id = a.id
            LEFT JOIN itineraries i ON n.itinerary_id = i.id
            WHERE n.user_id = $1
            ORDER BY n.last_activity_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await client.query(query, [userId, limit, offset]);
        return result.rows.map(row => ({
            id: row.id,
            type: row.type,
            isRead: row.is_read,
            postedAgo: timeAgo(row.last_activity_at),
            count: row.actor_ids?.length || 1,
            commentId: row.comment_id,
            badgeId: row.badge_id,
            countryCode: row.country_code,
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

    async getTotalCount(userId) {
        const result = await client.query(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    }

    async getPreferences(userId) {
        const result = await client.query(
            `SELECT notify_on_comment, notify_on_like, notify_on_follow, push_enabled
             FROM notification_preferences WHERE user_id = $1`,
            [userId]
        );
        if (result.rows.length === 0) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

        return mapPreferencesRow(result.rows[0]);
    }

    async upsertPreferences(userId, { notifyOnComment, notifyOnLike, notifyOnFollow, pushEnabled }) {
        const result = await client.query(
            `INSERT INTO notification_preferences (user_id, notify_on_comment, notify_on_like, notify_on_follow, push_enabled)
             VALUES ($1, COALESCE($2, true), COALESCE($3, true), COALESCE($4, true), COALESCE($5, true))
             ON CONFLICT (user_id) DO UPDATE SET
                 notify_on_comment = COALESCE($2, notification_preferences.notify_on_comment),
                 notify_on_like = COALESCE($3, notification_preferences.notify_on_like),
                 notify_on_follow = COALESCE($4, notification_preferences.notify_on_follow),
                 push_enabled = COALESCE($5, notification_preferences.push_enabled),
                 updated_at = NOW()
             RETURNING notify_on_comment, notify_on_like, notify_on_follow, push_enabled`,
            [userId, notifyOnComment ?? null, notifyOnLike ?? null, notifyOnFollow ?? null, pushEnabled ?? null]
        );

        return mapPreferencesRow(result.rows[0]);
    }
}
