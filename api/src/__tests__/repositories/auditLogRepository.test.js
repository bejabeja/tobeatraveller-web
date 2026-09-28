import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/clientPostgres.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import db from '../../db/clientPostgres.js';
import { AuditLogRepository } from '../../repositories/auditLogRepository.js';

describe('AuditLogRepository', () => {
    const repo = new AuditLogRepository();

    beforeEach(() => {
        db.query.mockReset();
    });

    it('log() inserts a row with the generated id, given fields and request context', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await repo.log({
            actorId: 'admin-1',
            actorUsername: 'root',
            action: 'update_role',
            targetUserId: 'user-1',
            targetUsername: 'jane',
            metadata: { previousRole: 'user', newRole: 'admin' },
            ipAddress: '203.0.113.1',
            userAgent: 'Mozilla/5.0',
        });

        const [queryText, params] = db.query.mock.calls[0];
        expect(queryText).toMatch(/INSERT INTO audit_log/);
        expect(params).toEqual([
            'mock-uuid', 'admin-1', 'root', 'update_role', 'user-1', 'jane',
            { previousRole: 'user', newRole: 'admin' }, '203.0.113.1', 'Mozilla/5.0',
        ]);
    });

    describe('buildFilters()', () => {
        it('returns no conditions when no filter is given', () => {
            const { conditions, values, nextIndex } = repo.buildFilters({});

            expect(conditions).toEqual([]);
            expect(values).toEqual([]);
            expect(nextIndex).toBe(1);
        });

        it('builds a parameterized condition per given filter', () => {
            const { conditions, values, nextIndex } = repo.buildFilters({
                actorId: 'admin-1', action: 'login_success', targetUserId: 'user-1',
                dateFrom: '2026-01-01', dateTo: '2026-02-01',
            });

            expect(conditions).toEqual([
                'actor_id = $1', 'action = $2', 'target_user_id = $3',
                'created_at >= $4', 'created_at <= $5',
            ]);
            expect(values).toEqual(['admin-1', 'login_success', 'user-1', '2026-01-01', '2026-02-01']);
            expect(nextIndex).toBe(6);
        });

        it('matches any of several actions with a single ANY() condition, given an array', () => {
            const { conditions, values, nextIndex } = repo.buildFilters({
                action: ['role_updated', 'tier_updated'],
            });

            expect(conditions).toEqual(['action = ANY($1)']);
            expect(values).toEqual([['role_updated', 'tier_updated']]);
            expect(nextIndex).toBe(2);
        });

        it('adds no condition for an empty action array', () => {
            const { conditions, values } = repo.buildFilters({ action: [] });

            expect(conditions).toEqual([]);
            expect(values).toEqual([]);
        });
    });

    describe('findByFilters()', () => {
        it('maps rows to camelCase and orders by newest first when no filter is given', async () => {
            db.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'log-1', actor_id: 'admin-1', actor_username: 'root', action: 'delete_user',
                        target_user_id: 'user-1', target_username: 'jane', metadata: null,
                        ip_address: '203.0.113.1', user_agent: 'Mozilla/5.0', created_at: '2026-01-01T00:00:00.000Z',
                    }],
                })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const { entries, total } = await repo.findByFilters({ limit: 10 });

            expect(entries).toEqual([{
                id: 'log-1', actorId: 'admin-1', actorUsername: 'root', action: 'delete_user',
                targetUserId: 'user-1', targetUsername: 'jane', metadata: null,
                ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0', createdAt: '2026-01-01T00:00:00.000Z',
            }]);
            expect(total).toBe(1);

            const [selectQuery, selectParams] = db.query.mock.calls[0];
            expect(selectQuery).toMatch(/ORDER BY created_at DESC/);
            expect(selectQuery).not.toMatch(/WHERE/);
            expect(selectParams).toEqual([10, 0]);
        });

        it('applies filters to both the select and the count query, with limit/offset appended only to the select', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            await repo.findByFilters({ action: 'login_failed', limit: 20, offset: 40 });

            const [selectQuery, selectParams] = db.query.mock.calls[0];
            expect(selectQuery).toMatch(/WHERE action = \$1/);
            expect(selectParams).toEqual(['login_failed', 20, 40]);

            const [countQuery, countParams] = db.query.mock.calls[1];
            expect(countQuery).toMatch(/WHERE action = \$1/);
            expect(countParams).toEqual(['login_failed']);
        });
    });

    it('deleteOlderThan() deletes rows past the given retention window and returns the count', async () => {
        db.query.mockResolvedValue({ rowCount: 7 });

        const deletedCount = await repo.deleteOlderThan(12);

        expect(deletedCount).toBe(7);
        const [queryText, params] = db.query.mock.calls[0];
        expect(queryText).toMatch(/DELETE FROM audit_log WHERE created_at < NOW\(\)/);
        expect(params).toEqual([12]);
    });
});
