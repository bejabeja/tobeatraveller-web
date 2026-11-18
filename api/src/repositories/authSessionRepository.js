import db from '../db/clientPostgres.js';

const toSession = (row) => row && {
    id: row.id,
    userId: row.user_id,
    tokenId: row.token_id,
    previousTokenId: row.previous_token_id,
    rotatedAt: row.rotated_at,
    expiresAt: row.expires_at,
};

export class AuthSessionRepository {
    async create({ id, userId, tokenId, expiresAt }) {
        await db.query(
            `INSERT INTO auth_sessions (id, user_id, token_id, expires_at) VALUES ($1, $2, $3, $4)`,
            [id, userId, tokenId, expiresAt]
        );
    }

    async findById(id) {
        const result = await db.query(`SELECT * FROM auth_sessions WHERE id = $1`, [id]);
        return toSession(result.rows[0]) ?? null;
    }

    // Only if the token being replaced is still the current one: of two renewals with the
    // same token at once, one rotates it and the other is told it did not.
    async rotate(id, currentTokenId, newTokenId) {
        const result = await db.query(
            `UPDATE auth_sessions
             SET previous_token_id = token_id, token_id = $3, rotated_at = NOW()
             WHERE id = $1 AND token_id = $2`,
            [id, currentTokenId, newTokenId]
        );
        return result.rowCount > 0;
    }

    async delete(id) {
        await db.query(`DELETE FROM auth_sessions WHERE id = $1`, [id]);
    }

    async deleteExpired() {
        const result = await db.query(`DELETE FROM auth_sessions WHERE expires_at < NOW()`);
        return result.rowCount;
    }
}
