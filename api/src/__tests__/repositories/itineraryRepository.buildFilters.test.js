import { describe, it, expect, vi } from 'vitest';

// Mock the DB client so the module can be imported without a real connection
vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import { ItineraryRepository } from '../../repositories/itineraryRepository.js';

describe('ItineraryRepository.buildFilters()', () => {
    const repo = new ItineraryRepository();

    it('always includes the role != test condition by default', () => {
        const { conditions, values } = repo.buildFilters({});

        expect(conditions).toContain("users.role != 'test'");
        expect(values).toHaveLength(0);
    });

    // Blocking someone keeps their trips out of the other person's listings, both ways.
    it('keeps out the trips of whoever is blocked with the viewer, only when there is a viewer', () => {
        const withViewer = repo.buildFilters({ viewerId: 'viewer-1' });
        const withoutViewer = repo.buildFilters({});

        expect(withViewer.values).toEqual(['viewer-1']);
        expect(withViewer.conditions.some(c => c.includes('user_blocks') && c.includes('itineraries.user_id'))).toBe(true);
        expect(withoutViewer.conditions.some(c => c.includes('user_blocks'))).toBe(false);
    });

    it('numbers the viewer placeholder after the other filters', () => {
        const { conditions, values } = repo.buildFilters({ category: 'relax', viewerId: 'viewer-1' });

        expect(values).toEqual(['relax', 'viewer-1']);
        expect(conditions.at(-1)).toContain('$2');
    });

    it('adds category condition when category is not "all"', () => {
        const { conditions, values } = repo.buildFilters({ category: 'adventure' });

        expect(conditions.some(c => c.includes('category'))).toBe(true);
        expect(values).toContain('adventure');
    });

    it('does NOT add category condition when category is "all"', () => {
        const { conditions } = repo.buildFilters({ category: 'all' });

        expect(conditions.some(c => c.includes('category ='))).toBe(false);
    });

    it('adds case-insensitive LIKE condition for destination', () => {
        const { conditions, values } = repo.buildFilters({ destination: 'Tokyo' });

        expect(conditions.some(c => c.includes('LIKE'))).toBe(true);
        expect(values.some(v => v.includes('Tokyo'))).toBe(true);
    });

    it('wraps destination value with % wildcards', () => {
        const { values } = repo.buildFilters({ destination: 'Paris' });
        expect(values).toContain('%Paris%');
    });

    it('adds a title/description search condition when search is present', () => {
        const { conditions, values } = repo.buildFilters({ search: 'volcano' });

        const searchCondition = conditions.find(c => c.includes('title') && c.includes('description'));
        expect(searchCondition).toBeDefined();
        expect(values).toContain('%volcano%');
    });

    it('does NOT add a search condition when search is absent or empty', () => {
        expect(repo.buildFilters({}).conditions.some(c => c.includes('title'))).toBe(false);
        expect(repo.buildFilters({ search: '' }).conditions.some(c => c.includes('title'))).toBe(false);
    });

    it('reuses a single parameter index for the search OR clause', () => {
        const { conditions, nextIndex } = repo.buildFilters({ search: 'beach' }, 3);

        expect(conditions.some(c => c.includes('$3'))).toBe(true);
        expect(nextIndex).toBe(4);
    });

    it('adds a location/title/description OR condition when query is present', () => {
        const { conditions, values } = repo.buildFilters({ query: 'volcano' });

        const queryCondition = conditions.find(
            c => c.includes('location_name') && c.includes('title') && c.includes('description')
        );
        expect(queryCondition).toBeDefined();
        expect(values).toContain('%volcano%');
    });

    it('does NOT add a query condition when query is absent or empty', () => {
        expect(repo.buildFilters({}).conditions.some(c => c.includes('location_name'))).toBe(false);
        expect(repo.buildFilters({ query: '' }).conditions.some(c => c.includes('location_name'))).toBe(false);
    });

    it('reuses a single parameter index for the query OR clause', () => {
        const { conditions, nextIndex } = repo.buildFilters({ query: 'beach' }, 3);

        expect(conditions.some(c => c.includes('$3'))).toBe(true);
        expect(nextIndex).toBe(4);
    });

    it('adds budgetMin condition', () => {
        const { conditions, values } = repo.buildFilters({ budgetMin: 500 });

        expect(conditions.some(c => c.includes('>= $'))).toBe(true);
        expect(values).toContain(500);
    });

    it('adds budgetMax condition', () => {
        const { conditions, values } = repo.buildFilters({ budgetMax: 3000 });

        expect(conditions.some(c => c.includes('<= $'))).toBe(true);
        expect(values).toContain(3000);
    });

    it('adds both budget conditions when both are set', () => {
        const { conditions, values } = repo.buildFilters({ budgetMin: 100, budgetMax: 2000 });
        const budgetConditions = conditions.filter(c => c.includes('budget'));

        expect(budgetConditions).toHaveLength(2);
        expect(values).toContain(100);
        expect(values).toContain(2000);
    });

    it('adds durationMin condition', () => {
        const { conditions, values } = repo.buildFilters({ durationMin: 3 });

        expect(conditions.some(c => c.includes('total_days >= $'))).toBe(true);
        expect(values).toContain(3);
    });

    it('adds durationMax condition', () => {
        const { conditions, values } = repo.buildFilters({ durationMax: 14 });

        expect(conditions.some(c => c.includes('total_days <= $'))).toBe(true);
        expect(values).toContain(14);
    });

    it('adds startDateMin condition', () => {
        const { conditions, values } = repo.buildFilters({ startDateMin: '2025-01-01' });

        expect(conditions.some(c => c.includes('start_date') && c.includes('>='))).toBe(true);
        expect(values).toContain('2025-01-01');
    });

    it('adds startDateMax condition', () => {
        const { conditions, values } = repo.buildFilters({ startDateMax: '2025-12-31' });

        expect(conditions.some(c => c.includes('start_date') && c.includes('<='))).toBe(true);
        expect(values).toContain('2025-12-31');
    });

    it('combines multiple filters correctly', () => {
        const { conditions, values } = repo.buildFilters({
            category: 'beach',
            destination: 'Bali',
            budgetMin: 200,
            budgetMax: 1500,
        });

        // Default (role + is_public) + category + destination + budgetMin + budgetMax = 6 conditions
        expect(conditions).toHaveLength(6);
        expect(values).toContain('beach');
        expect(values).toContain('%Bali%');
        expect(values).toContain(200);
        expect(values).toContain(1500);
    });

    it('increments parameter index correctly with indexStart', () => {
        const { conditions, nextIndex } = repo.buildFilters({ category: 'culture' }, 5);

        // Started at 5, category uses $5, so nextIndex should be 6
        expect(conditions.some(c => c.includes('$5'))).toBe(true);
        expect(nextIndex).toBe(6);
    });

    it('keeps only the trips made by van when asked for them', () => {
        const { conditions, values } = repo.buildFilters({ byVan: true });

        expect(conditions).toContain('itineraries.by_van = true');
        expect(values).toHaveLength(0);
    });

    it('does not narrow anything down when the trips by van are not asked for', () => {
        expect(repo.buildFilters({}).conditions.some(c => c.includes('by_van'))).toBe(false);
        expect(repo.buildFilters({ byVan: false }).conditions.some(c => c.includes('by_van'))).toBe(false);
    });
});
