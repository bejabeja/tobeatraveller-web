import client from '../db/clientPostgres.js';
import { toDateOnlyString } from '../models/vanLogEntry.js';
import { COUNTRY_VISITS_SQL, livedTripCondition } from './badgeRepository.js';

// The recap is seen in December, before the year ends: it only covers the
// part of the year lived so far, from $2 to today (or to $3 in January).
const LIVED_UNTIL = 'LEAST($3::date, CURRENT_DATE)';

// Every day of the year lived so far the user was on the road, with the
// country when known: each day covered by a trip they really made, and each
// van log and diary entry. The same sources as the passport, so the recap
// and the passport agree.
const YEAR_DAYS_SQL = `
    SELECT location_country_code AS code, entry_date AS day
    FROM van_log_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND ${LIVED_UNTIL}
    UNION ALL
    SELECT location_country_code, entry_date
    FROM life_diary_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND ${LIVED_UNTIL}
    UNION ALL
    SELECT i.location_country_code, d::date
    FROM itineraries i
    CROSS JOIN LATERAL generate_series(GREATEST(i.start_date, $2::date), LEAST(i.end_date, ${LIVED_UNTIL}), INTERVAL '1 day') AS d
    WHERE i.user_id = $1 AND ${livedTripCondition('i')} AND i.start_date <= ${LIVED_UNTIL} AND i.end_date >= $2::date
`;

// The yearly recap's figures, computed on demand from the user's own data.
// All private to them: only the recap's owner ever sees them.
export class RecapRepository {
    // Each country of the year, with how many days were spent there, when it
    // was first visited ever (to tell the new ones apart), and whether others
    // see it on the passport: a public trip ever went there, or the user
    // marked it themselves. The rest come only from what only they see.
    async getCountries(userId, from, to) {
        const result = await client.query(
            `WITH days AS (${YEAR_DAYS_SQL}),
                  first_visits AS (
                      SELECT code, MIN(visited_on) AS first_ever, BOOL_OR(is_public) AS has_public_visit
                      FROM (${COUNTRY_VISITS_SQL}) visits GROUP BY code
                  )
             SELECT days.code, COUNT(DISTINCT days.day) AS days, first_visits.first_ever,
                    first_visits.has_public_visit OR EXISTS (
                        SELECT 1 FROM user_declared_countries declared
                        WHERE declared.user_id = $1 AND declared.country_code = days.code
                    ) AS is_public
             FROM days JOIN first_visits ON first_visits.code = days.code
             WHERE days.code IS NOT NULL
             GROUP BY days.code, first_visits.first_ever, first_visits.has_public_visit
             ORDER BY days DESC, days.code`,
            [userId, from, to]
        );
        return result.rows.map(row => ({
            code: row.code,
            days: Number(row.days),
            firstEverVisitedOn: toDateOnlyString(row.first_ever),
            isPublic: row.is_public,
        }));
    }

    async getDaysOnRoad(userId, from, to) {
        const result = await client.query(
            `SELECT COUNT(DISTINCT day) AS days FROM (${YEAR_DAYS_SQL}) year_days`,
            [userId, from, to]
        );
        return Number(result.rows[0].days);
    }

    // Trips they really made that started during the year, and the longest of them.
    async getTrips(userId, from, to) {
        const [count, longest] = await Promise.all([
            client.query(
                `SELECT COUNT(*) AS count FROM itineraries
                 WHERE user_id = $1 AND ${livedTripCondition('itineraries')} AND start_date BETWEEN $2::date AND ${LIVED_UNTIL}`,
                [userId, from, to]
            ),
            client.query(
                `SELECT title, (end_date - start_date + 1) AS days FROM itineraries
                 WHERE user_id = $1 AND ${livedTripCondition('itineraries')} AND start_date BETWEEN $2::date AND ${LIVED_UNTIL}
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
             FROM van_log_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND ${LIVED_UNTIL}`,
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
             FROM life_diary_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date AND ${LIVED_UNTIL}`,
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

    // Who has something to see in the year's recap, for the announcement:
    // activity in the part of the year lived so far, like the recap itself.
    async findUsersWithActivity(from, to) {
        const result = await client.query(
            `SELECT user_id FROM van_log_entries WHERE entry_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE)
             UNION
             SELECT user_id FROM life_diary_entries WHERE entry_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE)
             UNION
             SELECT user_id FROM itineraries
             WHERE ${livedTripCondition('itineraries')} AND start_date <= LEAST($2::date, CURRENT_DATE) AND end_date >= $1::date`,
            [from, to]
        );
        return result.rows.map(row => row.user_id);
    }
}
