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

    // One statement that only marks a link nobody has used yet: of two requests with the same
    // link at the same time, only one gets true.
    async markAsUsed(id) {
        const result = await db.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }

    async deleteExpired() {
        const result = await db.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');
        return result.rowCount;
    }
}
