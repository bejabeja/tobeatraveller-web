import client from '../db/clientPostgres.js';
import { toDateOnlyString } from '../models/vanLogEntry.js';

// One row per (country, source) the user has been to: public trips
// (dated by their start), van log and life diary entries. Private trips
// don't count: they are usually plans or clones of someone else's trip,
// not places the user has been. Countries whose name couldn't be matched
// to an ISO code (country_code NULL) are left out.
const COUNTRY_VISITS_SQL = `
    SELECT location_country_code AS code, start_date AS visited_on, true AS is_public
    FROM itineraries WHERE user_id = $1 AND is_public = true AND location_country_code IS NOT NULL
    UNION ALL
    SELECT location_country_code, entry_date, false
    FROM van_log_entries WHERE user_id = $1 AND location_country_code IS NOT NULL
    UNION ALL
    SELECT location_country_code, entry_date, false
    FROM life_diary_entries WHERE user_id = $1 AND location_country_code IS NOT NULL
`;

export class BadgeRepository {
    async findEarnedByUserId(userId) {
        const result = await client.query(
            `SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at`,
            [userId]
        );
        return result.rows.map(row => ({ badgeId: row.badge_id, earnedAt: row.earned_at }));
    }

    // Returns only the badges actually inserted: a concurrent evaluation may
    // have saved some of them first, and those must not be announced twice.
    async insertEarned(userId, badgeIds) {
        if (badgeIds.length === 0) return [];
        const result = await client.query(
            `INSERT INTO user_badges (user_id, badge_id)
             SELECT $1, UNNEST($2::VARCHAR[])
             ON CONFLICT (user_id, badge_id) DO NOTHING
             RETURNING badge_id`,
            [userId, badgeIds]
        );
        return result.rows.map(row => row.badge_id);
    }

    async getMetrics(userId) {
        const result = await client.query(
            `WITH visits AS (${COUNTRY_VISITS_SQL})
             SELECT
                (SELECT COUNT(*) FROM itineraries WHERE user_id = $1 AND is_public = true) AS public_itineraries,
                (SELECT COUNT(*) FROM user_followers WHERE followed_id = $1) AS followers,
                (SELECT COUNT(*) FROM van_log_entries WHERE user_id = $1) AS van_log_entries,
                (SELECT COUNT(*) FROM life_diary_entries WHERE user_id = $1) AS life_diary_entries,
                (SELECT COUNT(DISTINCT code) FROM visits) AS countries,
                (SELECT COUNT(DISTINCT code) FROM visits WHERE is_public) AS public_countries`,
            [userId]
        );
        const row = result.rows[0];
        return {
            publicItineraries: Number(row.public_itineraries),
            followers: Number(row.followers),
            vanLogEntries: Number(row.van_log_entries),
            lifeDiaryEntries: Number(row.life_diary_entries),
            countries: Number(row.countries),
            publicCountries: Number(row.public_countries),
        };
    }

    // Each country with the date of its first visit, overall and counting
    // public trips only: other viewers must not learn a date that comes from
    // the owner's private van log or diary.
    async getCountryVisits(userId) {
        const result = await client.query(
            `SELECT code,
                    MIN(visited_on) AS first_visited_on,
                    MIN(visited_on) FILTER (WHERE is_public) AS first_public_visited_on
             FROM (${COUNTRY_VISITS_SQL}) visits
             GROUP BY code
             ORDER BY first_visited_on`,
            [userId]
        );
        return result.rows.map(row => ({
            code: row.code,
            firstVisitedOn: toDateOnlyString(row.first_visited_on),
            firstPublicVisitedOn: toDateOnlyString(row.first_public_visited_on),
        }));
    }
}
