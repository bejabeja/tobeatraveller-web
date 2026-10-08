import db from '../db/clientPostgres.js';
import { User } from '../models/user.js';
import { RETIRED_REFERRAL_CODE_RESERVATION } from '../utils/referralCode.js';
import { notBlockedWithViewer } from '../utils/blockFilter.js';
import { ROLES } from '../utils/roles.js';

const FEATURED_USERS_LIMIT = 3;

export class UserRepository {
    async save(user) {
        const {
            uuid, username, email, password, location, avatarUrl, termsAcceptedAt,
            signupCountryCode, signupUserAgent, referralCode, language,
        } = user;
        const result = await db.query(
            `INSERT INTO users (
                id, username, email, password, location, avatar_url, terms_accepted_at,
                signup_country_code, signup_user_agent, referral_code, language
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                uuid, username, email.trim().toLowerCase(), password, location, avatarUrl, termsAcceptedAt ?? null,
                signupCountryCode ?? null, signupUserAgent ?? null, referralCode ?? null, language ?? null,
            ]
        );

        return User.fromDb(result.rows[0]);
    }

    // A current code, or an earlier one still reserved for its owner after a
    // change of username.
    async findByReferralCode(code) {
        const result = await db.query(`
            SELECT users.* FROM users WHERE users.referral_code = $1
            UNION ALL
            SELECT users.* FROM referral_code_history
            JOIN users ON users.id = referral_code_history.user_id
            WHERE referral_code_history.code = $1
              AND referral_code_history.retired_at > NOW() - $2::interval
            LIMIT 1
        `, [code, RETIRED_REFERRAL_CODE_RESERVATION]);
        if (result.rows.length === 0) return null;

        return User.fromDb(result.rows[0]);
    }

    // Whether someone other than `userId` holds this code, now or as an
    // earlier one still reserved: taking that username would take their code.
    async isReferralCodeTakenByOther(code, userId = null) {
        const result = await db.query(`
            SELECT 1 FROM users WHERE referral_code = $1 AND id IS DISTINCT FROM $2
            UNION ALL
            SELECT 1 FROM referral_code_history
            WHERE code = $1 AND user_id IS DISTINCT FROM $2
              AND retired_at > NOW() - $3::interval
            LIMIT 1
        `, [code, userId, RETIRED_REFERRAL_CODE_RESERVATION]);
        return result.rows.length > 0;
    }

    // One statement, so the old code is never lost halfway: it moves to the
    // history (a row of theirs, or one whose reservation is over, is taken
    // over) and the new one becomes current; changing back to an earlier
    // name takes that code out of the history again.
    async changeReferralCode(userId, newCode) {
        await db.query(`
            WITH current_code AS (
                SELECT referral_code FROM users WHERE id = $1
            ),
            retired AS (
                INSERT INTO referral_code_history (code, user_id)
                SELECT referral_code, $1 FROM current_code
                WHERE referral_code IS NOT NULL AND referral_code <> $2
                ON CONFLICT (code) DO UPDATE
                SET user_id = EXCLUDED.user_id, retired_at = CURRENT_TIMESTAMP
                WHERE referral_code_history.user_id = EXCLUDED.user_id
                   OR referral_code_history.retired_at <= NOW() - $3::interval
            ),
            reclaimed AS (
                DELETE FROM referral_code_history WHERE code = $2 AND user_id = $1
            )
            UPDATE users SET referral_code = $2 WHERE id = $1
        `, [userId, newCode, RETIRED_REFERRAL_CODE_RESERVATION]);
    }

    async findRetiredReferralCodes(userId) {
        const result = await db.query(
            "SELECT code, retired_at FROM referral_code_history WHERE user_id = $1 ORDER BY retired_at DESC",
            [userId]
        );
        return result.rows.map(row => ({ code: row.code, retiredAt: row.retired_at }));
    }

    // Once the reservation is over the name is free for anyone: the row goes.
    async purgeRetiredReferralCodes() {
        const result = await db.query(
            "DELETE FROM referral_code_history WHERE retired_at <= NOW() - $1::interval",
            [RETIRED_REFERRAL_CODE_RESERVATION]
        );
        return result.rowCount;
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

    async getFeaturedUsers(viewerId = null) {
        const result = await db.query(`
            SELECT users.*
            FROM users
            WHERE users.role != 'test'
            AND EXISTS (
                SELECT 1 FROM itineraries WHERE itineraries.user_id = users.id
            )
            AND ($1::uuid IS NULL OR (
                users.id != $1
                AND NOT EXISTS (
                    SELECT 1 FROM user_followers
                    WHERE follower_id = $1 AND followed_id = users.id
                )
            ))
            ORDER BY RANDOM()
            LIMIT $2
        `, [viewerId, FEATURED_USERS_LIMIT]);

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

        // The change date moves only when the name really changes: the
        // right-hand side reads the row as it was before this update.
        const result = await db.query(
            `UPDATE users SET username = $1, name = $2, avatar_url = $3, location = $4, bio = $5, about = $6, updated_at = $7,
                username_changed_at = CASE WHEN LOWER(users.username) <> LOWER($1) THEN NOW() ELSE users.username_changed_at END
             WHERE id = $8 RETURNING *`,
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

    // Only the first confirmation counts, and the profile's last change (what the
    // sitemap reports) is not touched by it.
    async markEmailVerified(id) {
        const result = await db.query(
            "UPDATE users SET email_verified_at = NOW() WHERE id = $1 AND email_verified_at IS NULL RETURNING id",
            [id]
        );
        return result.rows.length > 0;
    }

    // The guard is in the statement: a confirmed address is never rewritten from here.
    async updateUnverifiedEmail(id, email) {
        const result = await db.query(
            "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 AND email_verified_at IS NULL RETURNING id",
            [email, id]
        );
        return result.rows.length > 0;
    }

    // A new password ends every session opened with the old one, in the same
    // statement so one cannot happen without the other. The moment is the server's
    // (whole seconds, like the `iat` of a token), not the database's: the two clocks
    // may differ, and a session started right after must not look older than this.
    async updatePassword(id, hashedPassword, now = new Date()) {
        const sessionsValidFrom = new Date(Math.floor(now.getTime() / 1000) * 1000);
        await db.query(
            "UPDATE users SET password = $1, sessions_valid_from = $2, updated_at = NOW() WHERE id = $3",
            [hashedPassword, sessionsValidFrom, id]
        );
    }

    // Not a profile edit: updated_at is left alone, as it is what the sitemap
    // reports as the profile's last change.
    async updateLanguage(id, language) {
        await db.query("UPDATE users SET language = $1 WHERE id = $2", [language, id]);
    }

    // A preference, not a profile edit: updated_at is left alone, like the language.
    async updateTravelStyle(id, travelStyle) {
        await db.query("UPDATE users SET travel_style = $1 WHERE id = $2", [travelStyle, id]);
    }

    async findByRole(role) {
        const result = await db.query(
            "SELECT * FROM users WHERE role = $1",
            [role]
        );
        return result.rows.map(row => User.fromDb(row));
    }

    async findByFilters({ searchName, offset = 0, limit = 9, sortBy = 'username', role, isPremium, viewerId, publicTripsOnly = false }) {
        const searchTerm = `%${searchName}%`;
        const tripsCount = `(SELECT COUNT(*) FROM itineraries WHERE itineraries.user_id = users.id${publicTripsOnly ? ' AND itineraries.is_public = true' : ''})`;

        const ORDER_CLAUSES = {
            itineraries: `${tripsCount} DESC, username ASC`,
            newest: 'created_at DESC',
            username: 'username ASC',
        };
        const orderClause = ORDER_CLAUSES[sortBy] ?? ORDER_CLAUSES.username;

        const conditions = ['username ILIKE $1', "role != 'test'"];
        const values = [searchTerm];

        if (Object.values(ROLES).includes(role)) {
            values.push(role);
            conditions.push(`role = $${values.length}`);
        }
        if (isPremium === true) {
            conditions.push('premium_until > NOW()');
        } else if (isPremium === false) {
            conditions.push('(premium_until IS NULL OR premium_until <= NOW())');
        }

        if (viewerId) {
            values.push(viewerId);
            conditions.push(notBlockedWithViewer(`$${values.length}`, 'users.id'));
        }

        const whereClause = conditions.join(' AND ');

        const result = await db.query(
            `
            SELECT users.*, ${tripsCount} AS total_itineraries
            FROM users
            WHERE ${whereClause}
            ORDER BY ${orderClause}
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
            `,
            [...values, limit, offset]
        );

        const countResult = await db.query(
            `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
            values
        );

        const total = parseInt(countResult.rows[0].count, 10);
        const users = result.rows.map(row => User.fromDb(row));

        return { users, total };
    }
}
