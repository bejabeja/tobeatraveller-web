import { describe, expect, it } from 'vitest';
import { notBlockedWithViewer } from '../../utils/blockFilter.js';

describe('notBlockedWithViewer', () => {
    it('leaves out a blocked person in both directions, using the placeholder and column given', () => {
        const sql = notBlockedWithViewer('$3', 'ic.user_id');

        expect(sql).toContain('b.blocker_id = $3 AND b.blocked_id = ic.user_id');
        expect(sql).toContain('b.blocker_id = ic.user_id AND b.blocked_id = $3');
        expect(sql).toMatch(/^NOT EXISTS/);
    });
});
