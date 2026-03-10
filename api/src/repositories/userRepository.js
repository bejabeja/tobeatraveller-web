import db from '../db/clientPostgres.js';
import { User } from '../models/user.js';

export class UserRepository {
    async save(user) {
        const { uuid, username, email, password, location, avatarUrl } = user;
        const result = await db.query(
            "INSERT INTO users (id, username, email, password, location, avatar_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [uuid, username, email, password, location, avatarUrl]
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
        const result = await db.query(
            "SELECT * FROM users WHERE role = 'featured' AND role != 'test' ORDER BY RANDOM() LIMIT 3"
        );

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

    async findByFilters({ searchName, offset = 0, limit = 9 }) {
        const searchTerm = `%${searchName}%`;

        const result = await db.query(
            `
            SELECT * FROM users
            WHERE username ILIKE $1 AND role != 'test'
            ORDER BY username ASC
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
