import client from '../db/clientPostgres.js';
import { toDateOnlyString } from '../models/vanLogEntry.js';
import { COUNTRY_VISITS_SQL } from './badgeRepository.js';

// Every day of the year ($2 to $3) the user was on the road, with the
// country when known: each day covered by a public trip (private trips are
// usually plans or clones), and each van log and diary entry. The same
// sources as the passport, so the recap and the passport agree.
const YEAR_DAYS_SQL = `
    SELECT location_country_code AS code, entry_date AS day
    FROM van_log_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND $3::date
    UNION ALL
    SELECT location_country_code, entry_date
    FROM life_diary_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND $3::date
    UNION ALL
    SELECT i.location_country_code, d::date
    FROM itineraries i
    CROSS JOIN LATERAL generate_series(GREATEST(i.start_date, $2::date), LEAST(i.end_date, $3::date), INTERVAL '1 day') AS d
    WHERE i.user_id = $1 AND i.is_public = true AND i.start_date <= $3::date AND i.end_date >= $2::date
`;

// The yearly recap's figures, computed on demand from the user's own data.
// All private to them: only the recap's owner ever sees them.
export class RecapRepository {
    // Each country of the year, with how many days were spent there and
    // when it was first visited ever (to tell the new ones apart).
    async getCountries(userId, from, to) {
        const result = await client.query(
            `WITH days AS (${YEAR_DAYS_SQL}),
                  first_visits AS (
                      SELECT code, MIN(visited_on) AS first_ever FROM (${COUNTRY_VISITS_SQL}) visits GROUP BY code
                  )
             SELECT days.code, COUNT(DISTINCT days.day) AS days, first_visits.first_ever
             FROM days JOIN first_visits ON first_visits.code = days.code
             WHERE days.code IS NOT NULL
             GROUP BY days.code, first_visits.first_ever
             ORDER BY days DESC, days.code`,
            [userId, from, to]
        );
        return result.rows.map(row => ({
            code: row.code,
            days: Number(row.days),
            firstEverVisitedOn: toDateOnlyString(row.first_ever),
        }));
    }

    async getDaysOnRoad(userId, from, to) {
        const result = await client.query(
            `SELECT COUNT(DISTINCT day) AS days FROM (${YEAR_DAYS_SQL}) year_days`,
            [userId, from, to]
        );
        return Number(result.rows[0].days);
    }

    // Public trips that started during the year, and the longest of them.
    async getTrips(userId, from, to) {
        const [count, longest] = await Promise.all([
            client.query(
                `SELECT COUNT(*) AS count FROM itineraries
                 WHERE user_id = $1 AND is_public = true AND start_date BETWEEN $2::date AND $3::date`,
                [userId, from, to]
            ),
            client.query(
                `SELECT title, (end_date - start_date + 1) AS days FROM itineraries
                 WHERE user_id = $1 AND is_public = true AND start_date BETWEEN $2::date AND $3::date
                 ORDER BY days DESC, start_date LIMIT 1`,
                [userId, from, to]
            ),
        ]);
        const longestRow = longest.rows[0];
        return {
            count: Number(count.rows[0].count),
            longest: longestRow ? { title: longestRow.title, days: Number(longestRow.days) } : null,
        };
    }

    // Litres are an estimate: only fuel entries with both the amount and the
    // price per litre logged can be converted.
    async getVanLog(userId, from, to) {
        const result = await client.query(
            `SELECT COUNT(*) AS entries,
                    COUNT(*) FILTER (WHERE category = 'overnight_stay') AS nights,
                    COUNT(*) FILTER (WHERE category = 'fuel') AS refuels,
                    COALESCE(SUM(amount / price_per_liter)
                        FILTER (WHERE category = 'fuel' AND amount IS NOT NULL AND price_per_liter > 0), 0) AS liters
             FROM van_log_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND $3::date`,
            [userId, from, to]
        );
        const row = result.rows[0];
        return {
            entries: Number(row.entries),
            nights: Number(row.nights),
            refuels: Number(row.refuels),
            liters: Number(row.liters),
        };
    }

    async getDiary(userId, from, to) {
        const result = await client.query(
            `SELECT COUNT(*) AS entries, COUNT(*) FILTER (WHERE would_return) AS would_return
             FROM life_diary_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND $3::date`,
            [userId, from, to]
        );
        const row = result.rows[0];
        return { entries: Number(row.entries), wouldReturn: Number(row.would_return) };
    }

    async getBadgesEarned(userId, from, to) {
        const result = await client.query(
            `SELECT badge_id FROM user_badges
             WHERE user_id = $1 AND earned_at >= $2::date AND earned_at < $3::date + 1
             ORDER BY earned_at`,
            [userId, from, to]
        );
        return result.rows.map(row => row.badge_id);
    }

    // Who has something to see in the year's recap, for the announcement.
    async findUsersWithActivity(from, to) {
        const result = await client.query(
            `SELECT user_id FROM van_log_entries WHERE entry_date BETWEEN $1::date AND $2::date
             UNION
             SELECT user_id FROM life_diary_entries WHERE entry_date BETWEEN $1::date AND $2::date
             UNION
             SELECT user_id FROM itineraries WHERE is_public = true AND start_date <= $2::date AND end_date >= $1::date`,
            [from, to]
        );
        return result.rows.map(row => row.user_id);
    }
}
