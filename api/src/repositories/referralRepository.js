import { v4 as uuidv4 } from 'uuid';
import db from '../db/clientPostgres.js';

const mapRow = (row) => ({
    id: row.id,
    referrerId: row.referrer_id,
    referredUserId: row.referred_user_id,
    status: row.status,
    createdAt: row.created_at,
    rewardedAt: row.rewarded_at,
});

export class ReferralRepository {
    // ON CONFLICT DO NOTHING on referred_user_id (unique): a user can only
    // ever be linked to the referrer whose link they signed up with first.
    async createPending(referrerId, referredUserId) {
        await db.query(
            `INSERT INTO referrals (id, referrer_id, referred_user_id, status)
             VALUES ($1, $2, $3, 'pending')
             ON CONFLICT (referred_user_id) DO NOTHING`,
            [uuidv4(), referrerId, referredUserId]
        );
    }

    async findPendingByReferredUserId(referredUserId) {
        const result = await db.query(
            `SELECT * FROM referrals WHERE referred_user_id = $1 AND status = 'pending'`,
            [referredUserId]
        );
        return result.rows.length ? mapRow(result.rows[0]) : null;
    }

    async markRewarded(id) {
        await db.query(
            `UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = $1`,
            [id]
        );
    }

    async getInvitesByReferrerId(referrerId) {
        const result = await db.query(
            `SELECT r.id, r.status, r.created_at, r.rewarded_at,
                    u.id AS referred_user_id, u.username, u.avatar_url
             FROM referrals r
             JOIN users u ON u.id = r.referred_user_id
             WHERE r.referrer_id = $1
             ORDER BY r.created_at DESC`,
            [referrerId]
        );
        return result.rows.map(row => ({
            id: row.id,
            status: row.status,
            createdAt: row.created_at,
            rewardedAt: row.rewarded_at,
            referredUser: { id: row.referred_user_id, username: row.username, avatarUrl: row.avatar_url },
        }));
    }

    async getStats(referrerId) {
        const result = await db.query(
            `SELECT
                 COUNT(*) AS invited,
                 COUNT(*) FILTER (WHERE status = 'rewarded') AS rewarded
             FROM referrals WHERE referrer_id = $1`,
            [referrerId]
        );
        const row = result.rows[0];
        return { invited: parseInt(row.invited, 10), rewarded: parseInt(row.rewarded, 10) };
    }

    async getPlatformStats() {
        const result = await db.query(
            `SELECT
                 COUNT(*) AS total_referrals,
                 COUNT(*) FILTER (WHERE status = 'rewarded') AS total_rewarded
             FROM referrals`
        );
        const row = result.rows[0];
        return {
            totalReferrals: parseInt(row.total_referrals, 10),
            totalRewarded: parseInt(row.total_rewarded, 10),
        };
    }

    async getTopReferrers(limit) {
        const result = await db.query(
            `SELECT u.id AS referrer_id, u.username, u.avatar_url,
                    COUNT(*) AS invited,
                    COUNT(*) FILTER (WHERE r.status = 'rewarded') AS rewarded
             FROM referrals r
             JOIN users u ON u.id = r.referrer_id
             GROUP BY u.id, u.username, u.avatar_url
             ORDER BY rewarded DESC, invited DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows.map(row => ({
            referrer: { id: row.referrer_id, username: row.username, avatarUrl: row.avatar_url },
            invited: parseInt(row.invited, 10),
            rewarded: parseInt(row.rewarded, 10),
        }));
    }
}
