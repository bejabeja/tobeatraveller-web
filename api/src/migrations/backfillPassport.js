import client from '../db/clientPostgres.js';
import { BadgeRepository } from '../repositories/badgeRepository.js';
import { BadgeService } from '../services/badgeService.js';
import { countryCodeFromLabel, countryCodeFromName } from '../utils/countryCodes.js';

// Run once after migrations 037, 038 and 039. Safe to run again: it only
// fills what is still missing.

// Rows saved before migration 038 have a country name (or a trip label) but
// no ISO code yet. Resolved per distinct value, so each name is looked up once.
const COUNTRY_CODE_SOURCES = [
    { table: 'itineraries', column: 'location_label', toCode: countryCodeFromLabel },
    { table: 'van_log_entries', column: 'location_country', toCode: countryCodeFromName },
    { table: 'life_diary_entries', column: 'location_country', toCode: countryCodeFromName },
];

async function backfillCountryCodes() {
    const unresolved = new Set();
    let updated = 0;

    for (const { table, column, toCode } of COUNTRY_CODE_SOURCES) {
        const { rows } = await client.query(
            `SELECT DISTINCT ${column} AS value FROM ${table}
             WHERE location_country_code IS NULL AND ${column} IS NOT NULL`
        );
        for (const { value } of rows) {
            const code = toCode(value);
            if (!code) {
                unresolved.add(value);
                continue;
            }
            const result = await client.query(
                `UPDATE ${table} SET location_country_code = $1
                 WHERE ${column} = $2 AND location_country_code IS NULL`,
                [code, value]
            );
            updated += result.rowCount;
        }
    }

    console.log(`✅ Country codes filled in on ${updated} rows`);
    if (unresolved.size > 0) {
        console.log(`   Not a recognizable country (left without a code): ${[...unresolved].join(' | ')}`);
    }
}

// Grants existing users the badges their past activity already earned, and
// stamps the countries they have already been to, without notifying them:
// otherwise their first action after the deploy would announce every old
// achievement and country at once.
async function backfillBadges() {
    const badgeService = new BadgeService(new BadgeRepository());
    const { rows: users } = await client.query('SELECT id FROM users');

    let granted = 0;
    for (const { id } of users) {
        const inserted = await badgeService.evaluateUser(id, { notify: false });
        granted += inserted.length;
    }

    console.log(`✅ Badges backfilled: ${granted} badges granted across ${users.length} users`);
}

backfillCountryCodes()
    .then(backfillBadges)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Passport backfill failed:', error);
        process.exit(1);
    });
