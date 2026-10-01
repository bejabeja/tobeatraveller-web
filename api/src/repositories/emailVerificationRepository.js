import db from '../db/clientPostgres.js';

export class EmailVerificationRepository {
    // One live token per person: asking for a new one makes the old one useless.
    async save({ userId, tokenHash, expiresAt }) {
        await db.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);

        const result = await db.query(
            `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    }

    async findByTokenHash(tokenHash) {
        const result = await db.query(
            `SELECT * FROM email_verification_tokens
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );
        return result.rows.length ? result.rows[0] : null;
    }

    async markAsUsed(id) {
        await db.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [id]);
    }
}
