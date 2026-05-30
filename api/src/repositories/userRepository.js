import db from '../db/clientPostgres.js';
import { User } from '../models/user.js';

export class UserRepository {
    async save(user) {
        const { uuid, username, email, password, location, avatarUrl, termsAcceptedAt } = user;
        const result = await db.query(
            "INSERT INTO users (id, username, email, password, location, avatar_url, terms_accepted_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [uuid, username, email, password, location, avatarUrl, termsAcceptedAt ?? null]
        );

        return User.fromDb(result.rows[0]);
    }

    async findByName(username) {
        const result = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    async findByEmail(email) {
        const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    async getAllUsers() {
        const result = await db.query("SELECT * FROM users WHERE role != 'test'");

        return result.rows.map(row => User.fromDb(row));
    }

    async getUserById(id) {
        const result = await db.query(
            "SELECT * FROM users WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    async getFeaturedUsers() {
        const result = await db.query(`
            SELECT users.*
            FROM users
            WHERE users.role != 'test'
            AND EXISTS (
                SELECT 1 FROM itineraries WHERE itineraries.user_id = users.id
            )
            ORDER BY RANDOM()
            LIMIT 3
        `);

        return result.rows.map(row => User.fromDb(row));
    }

    async findSuggested(currentUserId) {
        const result = await db.query(`
            SELECT users.*
            FROM users
            WHERE users.id != $1
              AND users.role != 'test'
              AND EXISTS (SELECT 1 FROM itineraries WHERE user_id = users.id)
            ORDER BY (SELECT COUNT(*) FROM itineraries WHERE user_id = users.id) DESC
            LIMIT 8
        `, [currentUserId]);
        return result.rows.map(row => User.fromDb(row));
    }

    async updateUser(id, userData) {
        const { username, name, avatarUrl, location, bio, about, updatedAt } = userData;

        const result = await db.query(
            "UPDATE users SET username = $1, name = $2, avatar_url = $3, location = $4, bio = $5, about = $6, updated_at =$7 WHERE id = $8 RETURNING *",
            [username, name, avatarUrl, location, bio, about, updatedAt, id]
        );

        return User.fromDb(result.rows[0]);
    }

    async deleteUser(id) {
        await db.query("DELETE FROM users WHERE id = $1", [id]);
    }

    async updatePassword(id, hashedPassword) {
        await db.query(
            "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
            [hashedPassword, id]
        );
    }

    async findByFilters({ searchName, offset = 0, limit = 9, sortBy = 'username' }) {
        const searchTerm = `%${searchName}%`;

        const orderClause = sortBy === 'itineraries'
            ? '(SELECT COUNT(*) FROM itineraries WHERE itineraries.user_id = users.id) DESC, username ASC'
            : 'username ASC';

        const result = await db.query(
            `
            SELECT * FROM users
            WHERE username ILIKE $1 AND role != 'test'
            ORDER BY ${orderClause}
            LIMIT $2 OFFSET $3
            `,
            [searchTerm, limit, offset]
        );

        const countResult = await db.query(
            `SELECT COUNT(*) FROM users WHERE username ILIKE $1 AND role != 'test'`,
            [searchTerm]
        );

        const total = parseInt(countResult.rows[0].count, 10);
        const users = result.rows.map(row => User.fromDb(row));

        return { users, total };
    }
}
