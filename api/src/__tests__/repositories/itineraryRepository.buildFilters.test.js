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

        expect(conditions.some(c => c.includes('EPOCH') && c.includes('>= $'))).toBe(true);
        expect(values).toContain(3);
    });

    it('adds durationMax condition', () => {
        const { conditions, values } = repo.buildFilters({ durationMax: 14 });

        expect(conditions.some(c => c.includes('EPOCH') && c.includes('<= $'))).toBe(true);
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
});
