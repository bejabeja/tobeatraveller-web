import client from '../db/clientPostgres.js';
import { toDateOnlyString } from '../models/vanLogEntry.js';

// A trip the user has really made: a public one, or a private one that
// isn't an untouched clone of someone else's trip (a clone keeps the
// original's dates and country until the user changes its dates).
export const livedTripCondition = (table) => `(${table}.is_public = true OR ${table}.cloned_from_itinerary_id IS NULL)`;

// One row per (country, source) the user has been to: the trips they really
// made (dated by their start; private ones make a private country, like van
// log and life diary entries). Not trips that haven't started yet (a trip
// for next summer is a plan) nor entries dated in the future. Countries whose
// name couldn't be matched to an ISO code (country_code NULL) are left out.
export const COUNTRY_VISITS_SQL = `
    SELECT location_country_code AS code, start_date AS visited_on, is_public
    FROM itineraries
    WHERE user_id = $1 AND ${livedTripCondition('itineraries')} AND location_country_code IS NOT NULL AND start_date <= CURRENT_DATE
    UNION ALL
    SELECT location_country_code, entry_date, false
    FROM van_log_entries WHERE user_id = $1 AND location_country_code IS NOT NULL AND entry_date <= CURRENT_DATE
    UNION ALL
    SELECT location_country_code, entry_date, false
    FROM life_diary_entries WHERE user_id = $1 AND location_country_code IS NOT NULL AND entry_date <= CURRENT_DATE
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

    async findStampedCountries(userId) {
        const result = await client.query(
            `SELECT country_code, stamped_at FROM user_country_stamps WHERE user_id = $1 ORDER BY stamped_at`,
            [userId]
        );
        return result.rows.map(row => ({ countryCode: row.country_code, stampedAt: row.stamped_at }));
    }

    // Returns only the countries actually inserted, for the same reason as
    // insertEarned: a concurrent evaluation must not announce them twice.
    async insertCountryStamps(userId, countryCodes) {
        if (countryCodes.length === 0) return [];
        const result = await client.query(
            `INSERT INTO user_country_stamps (user_id, country_code)
             SELECT $1, UNNEST($2::CHAR(2)[])
             ON CONFLICT (user_id, country_code) DO NOTHING
             RETURNING country_code`,
            [userId, countryCodes]
        );
        return result.rows.map(row => row.country_code);
    }

    async findDeclaredCountries(userId) {
        const result = await client.query(
            `SELECT country_code, declared_at FROM user_declared_countries WHERE user_id = $1 ORDER BY declared_at, country_code`,
            [userId]
        );
        return result.rows.map(row => ({ countryCode: row.country_code, declaredAt: row.declared_at }));
    }

    // Leaves exactly `countryCodes` declared, in one statement so the list is
    // never seen half replaced. The DELETE and the INSERT touch different
    // rows (the ones dropped and the ones added), and countries kept keep
    // the date they were first declared.
    async replaceDeclaredCountries(userId, countryCodes) {
        await client.query(
            `WITH dropped AS (
                DELETE FROM user_declared_countries
                WHERE user_id = $1 AND country_code <> ALL($2::CHAR(2)[])
             )
             INSERT INTO user_declared_countries (user_id, country_code)
             SELECT $1, UNNEST($2::CHAR(2)[])
             ON CONFLICT (user_id, country_code) DO NOTHING`,
            [userId, countryCodes]
        );
    }

    // The user and everyone they follow, ranked by countries from public
    // trips only: van log and diary are private and declared countries
    // aren't earned, so neither may rank anyone. Returns the top `limit`
    // plus the user themselves when they fall outside it. Test accounts are
    // hidden, as in the feeds.
    async getFollowingLeaderboard(userId, limit) {
        const result = await client.query(
            `WITH people AS (
                SELECT followed_id AS id FROM user_followers WHERE follower_id = $1
                UNION
                SELECT $1::UUID
             ),
             counts AS (
                SELECT u.id, u.username, u.avatar_url, COUNT(DISTINCT i.location_country_code) AS countries
                FROM people p
                JOIN users u ON u.id = p.id
                LEFT JOIN itineraries i
                    ON i.user_id = u.id AND i.is_public = true AND i.location_country_code IS NOT NULL
                    AND i.start_date <= CURRENT_DATE
                WHERE u.role IS DISTINCT FROM 'test' OR u.id = $1
                GROUP BY u.id, u.username, u.avatar_url
             ),
             ranked AS (
                SELECT *,
                    RANK() OVER (ORDER BY countries DESC) AS rank,
                    ROW_NUMBER() OVER (ORDER BY countries DESC, username) AS position
                FROM counts
             )
             SELECT * FROM ranked WHERE position <= $2 OR id = $1 ORDER BY position`,
            [userId, limit]
        );
        return result.rows.map(row => ({
            user: { id: row.id, username: row.username, avatarUrl: row.avatar_url },
            countries: Number(row.countries),
            rank: Number(row.rank),
            position: Number(row.position),
        }));
    }

    // Whose public trip with a known country starts today: the daily job
    // stamps that country on the day, even if they do nothing in the app.
    async findUsersWithTripStartingToday() {
        const result = await client.query(
            `SELECT DISTINCT user_id FROM itineraries
             WHERE ${livedTripCondition('itineraries')} AND location_country_code IS NOT NULL AND start_date = CURRENT_DATE`
        );
        return result.rows.map(row => row.user_id);
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
