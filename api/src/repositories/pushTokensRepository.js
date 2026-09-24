import { v4 as uuidv4 } from 'uuid';
import client from '../db/clientPostgres.js';

const mapRow = (row) => ({
    token: row.token,
    platform: row.platform,
    locale: row.locale,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
});

export class PushTokensRepository {
    // A device token is unique across users: if a different account logs in
    // on the same phone, the token moves to that account instead of the
    // previous one keeping on receiving its pushes.
    async upsert({ userId, token, platform, locale }) {
        await client.query(
            `INSERT INTO push_tokens (id, user_id, token, platform, locale)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (token) DO UPDATE SET
                 user_id = EXCLUDED.user_id,
                 platform = EXCLUDED.platform,
                 locale = EXCLUDED.locale,
                 last_seen_at = NOW()`,
            [uuidv4(), userId, token, platform, locale]
        );
    }

    async findByUserId(userId) {
        const result = await client.query(
            `SELECT token, platform, locale, created_at, last_seen_at
             FROM push_tokens WHERE user_id = $1 ORDER BY created_at`,
            [userId]
        );
        return result.rows.map(mapRow);
    }

    async deleteForUser(userId, token) {
        await client.query(
            `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
            [userId, token]
        );
    }

    async deleteTokens(tokens) {
        if (tokens.length === 0) return;
        await client.query(`DELETE FROM push_tokens WHERE token = ANY($1)`, [tokens]);
    }

    async deleteNotSeenSince(days) {
        const result = await client.query(
            `DELETE FROM push_tokens WHERE last_seen_at < NOW() - make_interval(days => $1)`,
            [days]
        );
        return result.rowCount;
    }
}
