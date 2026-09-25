import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import client from '../../db/clientPostgres.js';
import { RecapRepository } from '../../repositories/recapRepository.js';

const FROM = '2026-01-01';
const TO = '2026-12-31';

describe('RecapRepository', () => {
    const repo = new RecapRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    describe('getCountries()', () => {
        // Same sources as the passport: public trips (every day they cover in
        // the year), van log and diary entries; private trips are plans.
        it('counts the days spent in each country during the year, from the passport sources', async () => {
            client.query.mockResolvedValueOnce({ rows: [] });

            await repo.getCountries('user-1', FROM, TO);

            const [query, params] = client.query.mock.calls[0];
            expect(query).toMatch(/van_log_entries/);
            expect(query).toMatch(/life_diary_entries/);
            expect(query).toMatch(/is_public = true/);
            expect(query).toMatch(/generate_series/);
            expect(query).not.toMatch(/user_declared_countries/);
            expect(params).toEqual(['user-1', FROM, TO]);
        });

        it('maps each country with its days and the date of its first visit ever', async () => {
            client.query.mockResolvedValueOnce({ rows: [{ code: 'PT', days: '12', first_ever: new Date(2026, 4, 3) }] });

            expect(await repo.getCountries('user-1', FROM, TO)).toEqual([{ code: 'PT', days: 12, firstEverVisitedOn: '2026-05-03' }]);
        });
    });

    it('counts distinct days with any trip day, van log or diary entry in the year', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ days: '87' }] });

        expect(await repo.getDaysOnRoad('user-1', FROM, TO)).toBe(87);
        expect(client.query.mock.calls[0][0]).toMatch(/COUNT\(DISTINCT day\)/);
    });

    it('counts the public trips started in the year and finds the longest', async () => {
        client.query
            .mockResolvedValueOnce({ rows: [{ count: '4' }] })
            .mockResolvedValueOnce({ rows: [{ title: 'Portugal coast', days: 21 }] });

        expect(await repo.getTrips('user-1', FROM, TO)).toEqual({ count: 4, longest: { title: 'Portugal coast', days: 21 } });
    });

    it('has no longest trip without trips', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({ rows: [] });

        expect(await repo.getTrips('user-1', FROM, TO)).toEqual({ count: 0, longest: null });
    });

    // Litres only where both the amount and the price per litre were logged.
    it('sums van log entries by category and estimates the litres of fuel', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ entries: '40', nights: '25', refuels: '9', liters: '412.7' }] });

        expect(await repo.getVanLog('user-1', FROM, TO)).toEqual({ entries: 40, nights: 25, refuels: 9, liters: 412.7 });
        expect(client.query.mock.calls[0][0]).toMatch(/amount \/ price_per_liter/);
    });

    it('counts diary entries and the places the user would return to', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ entries: '15', would_return: '11' }] });

        expect(await repo.getDiary('user-1', FROM, TO)).toEqual({ entries: 15, wouldReturn: 11 });
    });

    it('lists the badges earned during the year', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ badge_id: 'countries_5' }] });

        expect(await repo.getBadgesEarned('user-1', FROM, TO)).toEqual(['countries_5']);
    });

    it('finds everyone with some activity in the year, for the announcement', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }, { user_id: 'u2' }] });

        expect(await repo.findUsersWithActivity(FROM, TO)).toEqual(['u1', 'u2']);
    });
});
