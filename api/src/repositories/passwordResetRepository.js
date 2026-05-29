import db from '../db/clientPostgres.js';

export class PasswordResetRepository {
    async save({ userId, tokenHash, expiresAt }) {
        // Delete any previous tokens for this user before inserting a new one
        await db.query(
            'DELETE FROM password_reset_tokens WHERE user_id = $1',
            [userId]
        );

        const result = await db.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, tokenHash, expiresAt]
        );

        return result.rows[0];
    }

    async findByTokenHash(tokenHash) {
        const result = await db.query(
            `SELECT * FROM password_reset_tokens
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) return null;
        return result.rows[0];
    }

    async markAsUsed(id) {
        await db.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
            [id]
        );
    }
}
