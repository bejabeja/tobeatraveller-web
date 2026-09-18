import db from '../db/clientPostgres.js';
import { User } from '../models/user.js';

export class UserRepository {
    async save(user) {
        const {
            uuid, username, email, password, location, avatarUrl, termsAcceptedAt,
            signupCountryCode, signupUserAgent, referralCode,
        } = user;
        const result = await db.query(
            `INSERT INTO users (
                id, username, email, password, location, avatar_url, terms_accepted_at,
                signup_country_code, signup_user_agent, referral_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                uuid, username, email.trim().toLowerCase(), password, location, avatarUrl, termsAcceptedAt ?? null,
                signupCountryCode ?? null, signupUserAgent ?? null, referralCode ?? null,
            ]
        );

        return User.fromDb(result.rows[0]);
    }

    async findByReferralCode(code) {
        const result = await db.query(
            "SELECT * FROM users WHERE referral_code = $1",
            [code]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    // Guarded on referral_code IS NULL for the same reason as
    // setStripeCustomerIdIfUnset: lets a lazy on-demand generation (the
    // first time a user opens the invite page) stay safe under concurrent
    // requests without a retry loop, since only one write can ever win.
    async setReferralCodeIfUnset(id, referralCode) {
        const result = await db.query(
            "UPDATE users SET referral_code = $1, updated_at = NOW() WHERE id = $2 AND referral_code IS NULL RETURNING *",
            [referralCode, id]
        );
        return result.rows.length ? User.fromDb(result.rows[0]) : null;
    }

    async findByName(username) {
        const result = await db.query(
            "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
            [username]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    async findByEmail(email) {
        const result = await db.query(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
            [email.trim()]
        );
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    async getAllUsers() {
        const result = await db.query("SELECT * FROM users WHERE role != 'test'");

        return result.rows.map(row => User.fromDb(row));
    }

    async findAllForSitemap() {
        const result = await db.query(`
            SELECT users.id, users.updated_at
            FROM users
            WHERE users.role != 'test'
              AND EXISTS (
                  SELECT 1 FROM itineraries
                  WHERE itineraries.user_id = users.id AND itineraries.is_public = true
              )
        `);

        return result.rows.map(row => ({ id: row.id, updatedAt: row.updated_at }));
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
              AND NOT EXISTS (
                  SELECT 1 FROM user_followers
                  WHERE follower_id = $1 AND followed_id = users.id
              )
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

    async updateRole(id, role) {
        const result = await db.query(
            "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            [role, id]
        );
        return result.rows.length ? User.fromDb(result.rows[0]) : null;
    }

    async updatePremiumUntil(id, premiumUntil) {
        const result = await db.query(
            "UPDATE users SET premium_until = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            [premiumUntil, id]
        );
        return result.rows.length ? User.fromDb(result.rows[0]) : null;
    }

    // Guarded on stripe_customer_id IS NULL so two concurrent first-time
    // checkout requests for the same user can't each create their own Stripe
    // customer and have the second write silently orphan the first: only one
    // of them wins this UPDATE (returns null for the loser), and the caller
    // is expected to fall back to whichever id actually got persisted.
    async setStripeCustomerIdIfUnset(id, stripeCustomerId) {
        const result = await db.query(
            "UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2 AND stripe_customer_id IS NULL RETURNING *",
            [stripeCustomerId, id]
        );
        return result.rows.length ? User.fromDb(result.rows[0]) : null;
    }

    async findByStripeCustomerId(stripeCustomerId) {
        const result = await db.query(
            "SELECT * FROM users WHERE stripe_customer_id = $1",
            [stripeCustomerId]
        );
        return result.rows.length ? User.fromDb(result.rows[0]) : null;
    }

    async updatePassword(id, hashedPassword) {
        await db.query(
            "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
            [hashedPassword, id]
        );
    }

    async findByRole(role) {
        const result = await db.query(
            "SELECT * FROM users WHERE role = $1",
            [role]
        );
        return result.rows.map(row => User.fromDb(row));
    }

    async findByFilters({ searchName, offset = 0, limit = 9, sortBy = 'username' }) {
        const searchTerm = `%${searchName}%`;

        const ORDER_CLAUSES = {
            itineraries: '(SELECT COUNT(*) FROM itineraries WHERE itineraries.user_id = users.id) DESC, username ASC',
            newest: 'created_at DESC',
            username: 'username ASC',
        };
        const orderClause = ORDER_CLAUSES[sortBy] ?? ORDER_CLAUSES.username;

        const result = await db.query(
            `
            SELECT users.*, (SELECT COUNT(*) FROM itineraries WHERE itineraries.user_id = users.id) AS total_itineraries
            FROM users
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
