import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

import client from '../../db/clientPostgres.js';
import { BadgeRepository } from '../../repositories/badgeRepository.js';

describe('BadgeRepository', () => {
    const repo = new BadgeRepository();

    beforeEach(() => {
        client.query.mockReset();
    });

    it('returns only the badges it inserted, skipping ones already saved', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ badge_id: 'explorer' }] });

        const inserted = await repo.insertEarned('user-1', ['explorer', 'adventurer']);

        expect(client.query.mock.calls[0][0]).toMatch(/ON CONFLICT \(user_id, badge_id\) DO NOTHING/);
        expect(inserted).toEqual(['explorer']);
    });

    it('skips the query when there is nothing to insert', async () => {
        const inserted = await repo.insertEarned('user-1', []);

        expect(client.query).not.toHaveBeenCalled();
        expect(inserted).toEqual([]);
    });

    it('returns only the countries it stamped, skipping ones already saved', async () => {
        client.query.mockResolvedValueOnce({ rows: [{ country_code: 'FR' }] });

        const stamped = await repo.insertCountryStamps('user-1', ['ES', 'FR']);

        expect(client.query.mock.calls[0][0]).toMatch(/ON CONFLICT \(user_id, country_code\) DO NOTHING/);
        expect(client.query.mock.calls[0][1]).toEqual(['user-1', ['ES', 'FR']]);
        expect(stamped).toEqual(['FR']);
    });

    it('skips the query when there is no country to stamp', async () => {
        expect(await repo.insertCountryStamps('user-1', [])).toEqual([]);
        expect(client.query).not.toHaveBeenCalled();
    });

    it('maps the stamped countries to camelCase', async () => {
        const stampedAt = new Date('2026-09-01');
        client.query.mockResolvedValueOnce({ rows: [{ country_code: 'ES', stamped_at: stampedAt }] });

        expect(await repo.findStampedCountries('user-1')).toEqual([{ countryCode: 'ES', stampedAt }]);
    });

    it('maps the declared countries to camelCase', async () => {
        const declaredAt = new Date('2026-09-01');
        client.query.mockResolvedValueOnce({ rows: [{ country_code: 'JP', declared_at: declaredAt }] });

        expect(await repo.findDeclaredCountries('user-1')).toEqual([{ countryCode: 'JP', declaredAt }]);
    });

    // One statement, so the list is never seen half replaced; the countries
    // kept keep their original date.
    it('replaces the declared countries in a single statement, keeping the ones still declared', async () => {
        client.query.mockResolvedValueOnce({ rows: [] });

        await repo.replaceDeclaredCountries('user-1', ['JP', 'TH']);

        expect(client.query).toHaveBeenCalledTimes(1);
        const [query, params] = client.query.mock.calls[0];
        expect(query).toMatch(/DELETE FROM user_declared_countries[\s\S]*country_code <> ALL\(\$2/);
        expect(query).toMatch(/INSERT INTO user_declared_countries[\s\S]*ON CONFLICT \(user_id, country_code\) DO NOTHING/);
        expect(params).toEqual(['user-1', ['JP', 'TH']]);
    });

    describe('getFollowingLeaderboard()', () => {
        const row = (overrides) => ({ id: 'u2', username: 'ana', avatar_url: null, countries: '7', rank: '1', position: '1', ...overrides });

        // Only public trips count: van log and diary are private, and declared
        // countries aren't earned, so neither may rank anyone.
        it('ranks the user and the people they follow by countries from public trips', async () => {
            client.query.mockResolvedValueOnce({ rows: [] });

            await repo.getFollowingLeaderboard('user-1', 10);

            const [query, params] = client.query.mock.calls[0];
            expect(query).toMatch(/FROM user_followers WHERE follower_id = \$1/);
            expect(query).toMatch(/i\.is_public = true/);
            expect(query).not.toMatch(/van_log_entries|life_diary_entries|user_declared_countries/);
            expect(query).toMatch(/RANK\(\) OVER/);
            expect(params).toEqual(['user-1', 10]);
        });

        it('keeps the user in the result even outside the top', async () => {
            client.query.mockResolvedValueOnce({ rows: [] });

            await repo.getFollowingLeaderboard('user-1', 10);

            expect(client.query.mock.calls[0][0]).toMatch(/position <= \$2 OR id = \$1/);
        });

        it('maps the rows, with numbers as numbers', async () => {
            client.query.mockResolvedValueOnce({ rows: [row({ avatar_url: 'a.jpg' })] });

            expect(await repo.getFollowingLeaderboard('user-1', 10)).toEqual([
                { user: { id: 'u2', username: 'ana', avatarUrl: 'a.jpg' }, countries: 7, rank: 1, position: 1 },
            ]);
        });
    });

    // Private trips are usually plans or clones, not places the user has been.
    it('counts countries by ISO code, from public trips, van log and diary only', async () => {
        client.query.mockResolvedValueOnce({ rows: [{
            public_itineraries: '2', followers: '0', van_log_entries: '0', life_diary_entries: '0', countries: '1', public_countries: '1',
        }] });

        await repo.getMetrics('user-1');

        const query = client.query.mock.calls[0][0];
        expect(query).toMatch(/FROM itineraries WHERE user_id = \$1 AND is_public = true AND location_country_code IS NOT NULL/);
        expect(query).toMatch(/FROM van_log_entries WHERE user_id = \$1 AND location_country_code IS NOT NULL/);
        expect(query).toMatch(/FROM life_diary_entries WHERE user_id = \$1 AND location_country_code IS NOT NULL/);
        expect(query).toMatch(/COUNT\(DISTINCT code\) FROM visits WHERE is_public/);
    });

    it('returns each visited country with its first date, overall and publicly', async () => {
        client.query.mockResolvedValueOnce({ rows: [
            { code: 'ES', first_visited_on: new Date(2026, 2, 1), first_public_visited_on: new Date(2026, 4, 1) },
            { code: 'FR', first_visited_on: new Date(2026, 5, 10), first_public_visited_on: null },
        ] });

        const visits = await repo.getCountryVisits('user-1');

        expect(visits).toEqual([
            { code: 'ES', firstVisitedOn: '2026-03-01', firstPublicVisitedOn: '2026-05-01' },
            { code: 'FR', firstVisitedOn: '2026-06-10', firstPublicVisitedOn: null },
        ]);
    });

    it('maps the counts to numbers', async () => {
        client.query.mockResolvedValueOnce({ rows: [{
            public_itineraries: '2', followers: '51', van_log_entries: '3', life_diary_entries: '4', countries: '5', public_countries: '1',
        }] });

        const metrics = await repo.getMetrics('user-1');

        expect(metrics).toEqual({
            publicItineraries: 2, followers: 51, vanLogEntries: 3, lifeDiaryEntries: 4, countries: 5, publicCountries: 1,
        });
    });
});
